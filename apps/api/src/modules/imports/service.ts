import type {
  CsvImportCommitRequest,
  CsvImportCommitResult,
  CsvImportPreview,
  CsvImportPreviewRequest,
  CsvImportPreviewRow,
  CsvMappedRow,
  ImportBatch,
} from '@sobra/shared';
import type { Db, PrismaClient } from '../../lib/db';
import { badRequest, notFound } from '../../lib/errors';
import { fromDbCents, toDbCents } from '../../lib/money';
import type { ImportBatch as ImportBatchRow } from '../../generated/prisma/client';
import { findOwnedAccount } from '../accounts/service';
import { createCategorySuggester } from './categorize';
import { mapCsvRow, normalizeText, parseCsvText } from './csv';

const IMPORT_NOT_FOUND = 'Importação não encontrada';

const toBatch = (row: ImportBatchRow): ImportBatch => ({
  id: row.id,
  accountId: row.accountId,
  fileName: row.fileName,
  rowCount: row.rowCount,
  importedCount: row.importedCount,
  skippedCount: row.skippedCount,
  createdAt: row.createdAt.toISOString(),
});

async function findImportAccount(db: Db, userId: string, accountId: string) {
  const account = await findOwnedAccount(db, userId, accountId);
  if (account.archived) throw badRequest('Conta arquivada não recebe novas transações');
  return account;
}

type DuplicateFields = { date: string; type: string; amount: number; description: string };

const duplicateKey = (row: DuplicateFields) =>
  `${row.date}|${row.type}|${row.amount}|${normalizeText(row.description)}`;

/**
 * Marks rows that match an existing transaction of the account (date, type, amount and
 * normalized description). Each existing transaction absorbs at most one row, so two identical
 * purchases in the file against one already recorded leave one of them as new.
 */
async function duplicateFlags(
  db: Db,
  userId: string,
  accountId: string,
  rows: readonly (CsvMappedRow | null)[],
): Promise<boolean[]> {
  const dates = rows.flatMap((row) => (row ? [row.date] : [])).sort();
  const [first] = dates;
  const last = dates.at(-1);
  if (first === undefined || last === undefined) return rows.map(() => false);

  const existing = await db.transaction.findMany({
    where: {
      userId,
      accountId,
      type: { in: ['income', 'expense'] },
      date: { gte: first, lte: last },
    },
    select: { date: true, type: true, amount: true, description: true },
  });
  const available = new Map<string, number>();
  for (const row of existing) {
    const key = duplicateKey({ ...row, amount: fromDbCents(row.amount) });
    available.set(key, (available.get(key) ?? 0) + 1);
  }

  return rows.map((row) => {
    if (!row) return false;
    const key = duplicateKey(row);
    const count = available.get(key) ?? 0;
    if (count === 0) return false;
    available.set(key, count - 1);
    return true;
  });
}

export async function previewImport(
  db: Db,
  userId: string,
  input: CsvImportPreviewRequest,
): Promise<CsvImportPreview> {
  await findImportAccount(db, userId, input.accountId);
  const parsed =
    'csv' in input
      ? parseCsvText(input.csv)
      : input.rows.map((raw, index) => ({ rowNumber: index + 1, raw }));

  const categories = await db.category.findMany({
    where: { userId },
    select: { id: true, name: true, kind: true },
  });
  const suggest = createCategorySuggester(categories);

  const results = parsed.map((row) => ({ ...row, ...mapCsvRow(row.raw) }));
  const duplicates = await duplicateFlags(
    db,
    userId,
    input.accountId,
    results.map((row) => row.mapped),
  );

  const rows: CsvImportPreviewRow[] = results.map((row, index) => ({
    rowNumber: row.rowNumber,
    raw: row.raw,
    mapped: row.mapped,
    error: row.error,
    suggestedCategoryId: row.mapped ? suggest(row.mapped.description, row.mapped.type) : null,
    duplicate: duplicates[index] ?? false,
  }));
  const validCount = rows.filter((row) => row.mapped !== null).length;
  return {
    accountId: input.accountId,
    rows,
    validCount,
    invalidCount: rows.length - validCount,
    duplicateCount: rows.filter((row) => row.duplicate).length,
  };
}

async function assertImportCategories(
  db: Db,
  userId: string,
  rows: CsvImportCommitRequest['rows'],
) {
  const ids = [...new Set(rows.map((row) => row.categoryId))];
  const categories = await db.category.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true, kind: true },
  });
  const kindById = new Map(categories.map((category) => [category.id, category.kind]));
  for (const row of rows) {
    const kind = kindById.get(row.categoryId);
    if (!kind) throw notFound('Categoria não encontrada');
    if (kind !== row.type) {
      throw badRequest(
        row.type === 'income'
          ? 'Uma receita só pode usar categoria de receita'
          : 'Uma despesa só pode usar categoria de despesa',
      );
    }
  }
}

/**
 * Creates the batch and its transactions atomically. Rows matching an existing transaction are
 * skipped unless `force` is set.
 */
export async function commitImport(
  prisma: PrismaClient,
  userId: string,
  input: CsvImportCommitRequest,
): Promise<CsvImportCommitResult> {
  return prisma.$transaction(async (tx) => {
    await findImportAccount(tx, userId, input.accountId);
    await assertImportCategories(tx, userId, input.rows);

    const duplicates = input.force
      ? input.rows.map(() => false)
      : await duplicateFlags(tx, userId, input.accountId, input.rows);
    const toImport = input.rows.filter((_, index) => !duplicates[index]);

    const batch = await tx.importBatch.create({
      data: {
        userId,
        accountId: input.accountId,
        fileName: input.fileName ?? null,
        rowCount: input.rows.length,
        importedCount: toImport.length,
        skippedCount: input.rows.length - toImport.length,
      },
    });
    if (toImport.length > 0) {
      await tx.transaction.createMany({
        data: toImport.map((row) => ({
          userId,
          type: row.type,
          accountId: input.accountId,
          categoryId: row.categoryId,
          amount: toDbCents(row.amount),
          date: row.date,
          description: row.description,
          importBatchId: batch.id,
        })),
      });
    }
    return { imported: batch.importedCount, skipped: batch.skippedCount, batchId: batch.id };
  });
}

async function findOwnedBatch(db: Db, userId: string, id: string): Promise<ImportBatchRow> {
  const row = await db.importBatch.findFirst({ where: { id, userId } });
  if (!row) throw notFound(IMPORT_NOT_FOUND);
  return row;
}

export async function listImports(db: Db, userId: string): Promise<ImportBatch[]> {
  const rows = await db.importBatch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return rows.map(toBatch);
}

export async function getImport(db: Db, userId: string, id: string): Promise<ImportBatch> {
  return toBatch(await findOwnedBatch(db, userId, id));
}

/** Undoes an import: deletes the batch and the transactions it created. */
export async function deleteImport(prisma: PrismaClient, userId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    await findOwnedBatch(tx, userId, id);
    await tx.transaction.deleteMany({ where: { userId, importBatchId: id } });
    await tx.importBatch.delete({ where: { id } });
  });
}
