import type { Budget, BudgetUpsert, MonthKey } from '@financas/shared';
import type { Db } from '../../lib/db';
import { badRequest, notFound } from '../../lib/errors';
import { fromDbCents, sumOrZero, toDbCents } from '../../lib/money';
import { monthDateRange } from '../../lib/period';
import type { Budget as BudgetRow } from '../../generated/prisma/client';
import { findOwnedCategory } from '../categories/service';

const BUDGET_NOT_FOUND = 'Orçamento não encontrado';

const toBudget = (row: BudgetRow, spent = 0n): Budget => ({
  id: row.id,
  categoryId: row.categoryId,
  month: row.month as MonthKey,
  amount: fromDbCents(row.amount),
  spent: fromDbCents(spent),
  remaining: fromDbCents(row.amount - spent),
});

/** Expenses of `month` per category (only the given categories when `categoryIds` is set). */
export async function expensesByCategory(
  db: Db,
  userId: string,
  month: MonthKey,
  { categoryIds, accountId }: { categoryIds?: string[]; accountId?: string | undefined } = {},
): Promise<Map<string, bigint>> {
  const { start, end } = monthDateRange(month);
  const rows = await db.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'expense',
      date: { gte: start, lt: end },
      categoryId: categoryIds ? { in: categoryIds } : { not: null },
      ...(accountId && { accountId }),
    },
    _sum: { amount: true },
  });
  return new Map(
    rows.flatMap((row) => (row.categoryId ? [[row.categoryId, sumOrZero(row._sum.amount)]] : [])),
  );
}

async function withSpent(
  db: Db,
  userId: string,
  month: MonthKey,
  rows: BudgetRow[],
): Promise<Budget[]> {
  if (rows.length === 0) return [];
  const spent = await expensesByCategory(db, userId, month, {
    categoryIds: rows.map((row) => row.categoryId),
  });
  return rows.map((row) => toBudget(row, spent.get(row.categoryId)));
}

const listRows = (db: Db, userId: string, month: MonthKey) =>
  db.budget.findMany({
    where: { userId, month },
    orderBy: [{ category: { name: 'asc' } }, { createdAt: 'asc' }],
  });

export async function listBudgets(db: Db, userId: string, month: MonthKey): Promise<Budget[]> {
  return withSpent(db, userId, month, await listRows(db, userId, month));
}

export async function upsertBudget(db: Db, userId: string, input: BudgetUpsert): Promise<Budget> {
  const category = await findOwnedCategory(db, userId, input.categoryId);
  if (category.kind !== 'expense') {
    throw badRequest('Orçamentos só podem ser definidos para categorias de despesa');
  }
  const amount = toDbCents(input.amount);
  const row = await db.budget.upsert({
    where: {
      userId_categoryId_month: { userId, categoryId: input.categoryId, month: input.month },
    },
    create: { userId, categoryId: input.categoryId, month: input.month, amount },
    update: { amount },
  });
  const spent = await expensesByCategory(db, userId, input.month, {
    categoryIds: [row.categoryId],
  });
  return toBudget(row, spent.get(row.categoryId));
}

export async function deleteBudget(db: Db, userId: string, id: string): Promise<void> {
  const budget = await db.budget.findFirst({ where: { id, userId } });
  if (!budget) throw notFound(BUDGET_NOT_FOUND);
  await db.budget.delete({ where: { id } });
}

/** Copies the budgets of `from` into `to`, keeping those `to` already has. Returns all of `to`. */
export async function copyBudgets(
  db: Db,
  userId: string,
  { from, to }: { from: MonthKey; to: MonthKey },
): Promise<Budget[]> {
  if (from === to) throw badRequest('Escolha meses diferentes para copiar o orçamento');
  const [source, target] = await Promise.all([
    db.budget.findMany({ where: { userId, month: from } }),
    db.budget.findMany({ where: { userId, month: to }, select: { categoryId: true } }),
  ]);
  const taken = new Set(target.map((budget) => budget.categoryId));
  const missing = source.filter((budget) => !taken.has(budget.categoryId));
  if (missing.length > 0) {
    await db.budget.createMany({
      data: missing.map(({ categoryId, amount }) => ({ userId, categoryId, amount, month: to })),
    });
  }
  return listBudgets(db, userId, to);
}
