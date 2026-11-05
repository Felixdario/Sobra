import {
  type IconName,
  mergeTransactionUpdate,
  monthKey,
  nextMonth,
  type Paginated,
  type Transaction,
  type TransactionCreate,
  type TransactionFilters,
  toLocalDateKey,
  type TransactionUpdate,
} from '@sobra/shared';
import { type Db, isUniqueViolation, type Prisma } from '../../lib/db';
import { toSystemKey } from '../../lib/categories';
import { AppError, conflict, notFound } from '../../lib/errors';
import { fromDbCents, toDbCents } from '../../lib/money';
import type { Transaction as TransactionRow } from '../../generated/prisma/client';
import { syncDueRecurring } from '../recurring/service';
import { assertTransactionRefs } from './refs';

const TRANSACTION_NOT_FOUND = 'Transação não encontrada';

const accountRef = { select: { id: true, name: true } } as const;

/** Relations embedded in every transaction response, loaded in the same query as the row. */
export const transactionInclude = {
  account: accountRef,
  toAccount: accountRef,
  category: { select: { id: true, name: true, color: true, icon: true, systemKey: true } },
} satisfies Prisma.TransactionInclude;

type TransactionWithRefs = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export function toTransaction(row: TransactionWithRefs): Transaction {
  const meta = {
    id: row.id,
    accountId: row.accountId,
    account: row.account,
    amount: fromDbCents(row.amount),
    description: row.description,
    date: row.date,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.type === 'transfer') {
    return {
      ...meta,
      type: 'transfer',
      toAccountId: row.toAccountId ?? '',
      toAccount: row.toAccount ?? { id: row.toAccountId ?? '', name: '' },
      category: null,
    };
  }
  const { category } = row;
  return {
    ...meta,
    type: row.type,
    categoryId: row.categoryId ?? '',
    category: category && {
      ...category,
      icon: category.icon as IconName,
      systemKey: toSystemKey(category.systemKey),
    },
    toAccount: null,
  };
}

function toCreateInput(row: TransactionRow): TransactionCreate {
  const base = {
    accountId: row.accountId,
    amount: fromDbCents(row.amount),
    description: row.description,
    date: row.date,
    ...(row.notes !== null && { notes: row.notes }),
  };
  return row.type === 'transfer'
    ? { ...base, type: 'transfer', toAccountId: row.toAccountId ?? '' }
    : { ...base, type: row.type, categoryId: row.categoryId ?? '' };
}

/** Columns for a transaction write; the reference that does not apply to the type is cleared. */
export function transactionData(input: TransactionCreate) {
  return {
    type: input.type,
    accountId: input.accountId,
    toAccountId: input.type === 'transfer' ? input.toAccountId : null,
    categoryId: input.type === 'transfer' ? null : input.categoryId,
    amount: toDbCents(input.amount),
    date: input.date,
    description: input.description,
    notes: input.notes ?? null,
  };
}

async function findOwnedTransaction(db: Db, userId: string, id: string): Promise<TransactionRow> {
  const row = await db.transaction.findFirst({ where: { id, userId } });
  if (!row) throw notFound(TRANSACTION_NOT_FOUND);
  return row;
}

/** Variants that make SQLite's ASCII-only case-insensitive LIKE also catch accented letters. */
function searchVariants(search: string): string[] {
  return [...new Set([search, search.toLowerCase(), search.toUpperCase()])];
}

function listWhere(userId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [];
  if (filters.accountId) {
    and.push({ OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] });
  }
  if (filters.search) {
    and.push({
      OR: searchVariants(filters.search).flatMap((term) => [
        { description: { contains: term } },
        { notes: { contains: term } },
      ]),
    });
  }
  return {
    userId,
    ...(filters.month && {
      date: { gte: `${filters.month}-01`, lt: `${nextMonth(monthKey(filters.month))}-01` },
    }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.type && { type: filters.type }),
    ...(and.length > 0 && { AND: and }),
  };
}

export async function listTransactions(
  db: Db,
  userId: string,
  filters: TransactionFilters,
  today: string = toLocalDateKey(new Date()),
): Promise<Paginated<Transaction>> {
  await syncDueRecurring(db, userId, today);

  const where = listWhere(userId, filters);
  const { field, direction } = filters.sort;
  const [total, rows] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      orderBy: [{ [field]: direction }, { createdAt: direction }, { id: direction }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: transactionInclude,
    }),
  ]);
  return {
    items: rows.map(toTransaction),
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: Math.ceil(total / filters.pageSize),
  };
}

export async function getTransaction(db: Db, userId: string, id: string): Promise<Transaction> {
  const row = await db.transaction.findFirst({
    where: { id, userId },
    include: transactionInclude,
  });
  if (!row) throw notFound(TRANSACTION_NOT_FOUND);
  return toTransaction(row);
}

export async function createTransaction(
  db: Db,
  userId: string,
  input: TransactionCreate,
): Promise<Transaction> {
  await assertTransactionRefs(db, userId, input);
  const row = await db.transaction.create({
    data: { ...transactionData(input), userId },
    include: transactionInclude,
  });
  return toTransaction(row);
}

export async function updateTransaction(
  db: Db,
  userId: string,
  id: string,
  update: TransactionUpdate,
): Promise<Transaction> {
  const current = await findOwnedTransaction(db, userId, id);
  const merged = mergeTransactionUpdate(toCreateInput(current), update);
  if (!merged.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Dados inválidos',
      merged.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        in: 'body',
        message: issue.message,
      })),
    );
  }

  const previous = [current.accountId, current.toAccountId].filter((value) => value !== null);
  await assertTransactionRefs(db, userId, merged.data, previous);
  try {
    const row = await db.transaction.update({
      where: { id },
      data: transactionData(merged.data),
      include: transactionInclude,
    });
    return toTransaction(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Já existe uma ocorrência desta recorrência nessa data');
    }
    throw error;
  }
}

export async function deleteTransaction(db: Db, userId: string, id: string): Promise<void> {
  await findOwnedTransaction(db, userId, id);
  await db.transaction.delete({ where: { id } });
}
