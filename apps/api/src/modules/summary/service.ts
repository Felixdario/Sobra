import {
  type BalanceHistory,
  type BudgetVsActual,
  type Delta,
  type IconName,
  type IncomeVsExpenseSeries,
  type MonthKey,
  type MonthSummary,
  type SpendingByCategory,
  percentOf,
  previousMonth,
} from '@sobra/shared';
import type { Db } from '../../lib/db';
import { badRequest } from '../../lib/errors';
import { fromDbCents, sumOrZero } from '../../lib/money';
import { daysOfMonth, monthCount, monthDateRange, monthsBetween } from '../../lib/period';
import { accountMovements, findOwnedAccount } from '../accounts/service';
import { expensesByCategory } from '../budgets/service';

export const MAX_RANGE_MONTHS = { month: 120, day: 12 } as const;

type Granularity = keyof typeof MAX_RANGE_MONTHS;
type Flows = { income: bigint; expense: bigint };

/** Accounts whose balance makes up the total: one account, or every non-archived one. */
type BalanceScope = { accountIds: string[]; initialBalance: bigint };

async function balanceScope(db: Db, userId: string, accountId?: string): Promise<BalanceScope> {
  if (accountId) {
    const account = await findOwnedAccount(db, userId, accountId);
    return { accountIds: [account.id], initialBalance: account.initialBalance };
  }
  const accounts = await db.account.findMany({
    where: { userId, archived: false },
    select: { id: true, initialBalance: true },
  });
  return {
    accountIds: accounts.map((account) => account.id),
    initialBalance: accounts.reduce((sum, account) => sum + account.initialBalance, 0n),
  };
}

/** Total balance of the scope counting only days before `before` ("YYYY-MM-DD"). */
async function balanceBefore(
  db: Db,
  userId: string,
  scope: BalanceScope,
  before: string,
): Promise<bigint> {
  const movements = await accountMovements(db, userId, scope.accountIds, { before });
  let total = scope.initialBalance;
  for (const movement of movements.values()) total += movement;
  return total;
}

const flowsWhere = (userId: string, start: string, end: string, accountId?: string) => ({
  userId,
  type: { in: ['income' as const, 'expense' as const] },
  date: { gte: start, lt: end },
  ...(accountId && { accountId }),
});

/** Income and expense of a month. Transfers only move money between accounts and are left out. */
async function monthFlows(
  db: Db,
  userId: string,
  month: MonthKey,
  accountId?: string,
): Promise<Flows> {
  const { start, end } = monthDateRange(month);
  const rows = await db.transaction.groupBy({
    by: ['type'],
    where: flowsWhere(userId, start, end, accountId),
    _sum: { amount: true },
  });
  const flows: Flows = { income: 0n, expense: 0n };
  for (const row of rows) {
    if (row.type !== 'transfer') flows[row.type] = sumOrZero(row._sum.amount);
  }
  return flows;
}

function delta(current: bigint, previous: bigint): Delta {
  const absolute = fromDbCents(current - previous);
  const base = fromDbCents(previous < 0n ? -previous : previous);
  return { absolute, percent: percentOf(absolute, base) };
}

function assertRange(from: MonthKey, to: MonthKey, granularity: Granularity): void {
  const max = MAX_RANGE_MONTHS[granularity];
  if (monthCount(from, to) > max) {
    const unit = granularity === 'day' ? 'diária' : 'mensal';
    throw badRequest(`O período deve ter no máximo ${max} meses na visão ${unit}`);
  }
}

export async function monthSummary(
  db: Db,
  userId: string,
  { month, accountId }: { month: MonthKey; accountId?: string | undefined },
): Promise<MonthSummary> {
  const scope = await balanceScope(db, userId, accountId);
  const previous = previousMonth(month);
  const { start, end } = monthDateRange(month);
  const [current, before, balance, previousBalance] = await Promise.all([
    monthFlows(db, userId, month, accountId),
    monthFlows(db, userId, previous, accountId),
    balanceBefore(db, userId, scope, end),
    balanceBefore(db, userId, scope, start),
  ]);
  const income = fromDbCents(current.income);
  return {
    month,
    income,
    expense: fromDbCents(current.expense),
    balance: fromDbCents(balance),
    savingsRate: percentOf(fromDbCents(current.income - current.expense), income),
    previous: {
      month: previous,
      income: fromDbCents(before.income),
      expense: fromDbCents(before.expense),
      balance: fromDbCents(previousBalance),
    },
    delta: {
      income: delta(current.income, before.income),
      expense: delta(current.expense, before.expense),
      balance: delta(balance, previousBalance),
    },
  };
}

export async function incomeVsExpense(
  db: Db,
  userId: string,
  { from, to, accountId }: { from: MonthKey; to: MonthKey; accountId?: string | undefined },
): Promise<IncomeVsExpenseSeries> {
  assertRange(from, to, 'month');
  if (accountId) await findOwnedAccount(db, userId, accountId);
  const months = monthsBetween(from, to);
  const byMonth = new Map<string, Flows>(
    months.map((month) => [month, { income: 0n, expense: 0n }]),
  );

  // Prisma's groupBy can't group by a substring of `date`, so this groups per day and type
  // (rows bounded by the days in the range, not by the number of transactions) and buckets by month.
  const rows = await db.transaction.groupBy({
    by: ['date', 'type'],
    where: flowsWhere(userId, `${from}-01`, monthDateRange(to).end, accountId),
    _sum: { amount: true },
  });
  for (const row of rows) {
    const flows = byMonth.get(row.date.slice(0, 7));
    if (flows && row.type !== 'transfer') flows[row.type] += sumOrZero(row._sum.amount);
  }

  return {
    points: months.map((month) => {
      const { income, expense } = byMonth.get(month) ?? { income: 0n, expense: 0n };
      return {
        month,
        income: fromDbCents(income),
        expense: fromDbCents(expense),
        net: fromDbCents(income - expense),
      };
    }),
  };
}

export async function spendingByCategory(
  db: Db,
  userId: string,
  { month, accountId }: { month: MonthKey; accountId?: string | undefined },
): Promise<SpendingByCategory> {
  if (accountId) await findOwnedAccount(db, userId, accountId);
  const spent = await expensesByCategory(db, userId, month, { accountId });
  const categories = await db.category.findMany({
    where: { userId, id: { in: [...spent.keys()] } },
    select: { id: true, name: true, color: true, icon: true },
  });
  const total = fromDbCents([...spent.values()].reduce((sum, amount) => sum + amount, 0n));
  const items = categories
    .map((category) => {
      const amount = fromDbCents(spent.get(category.id) ?? 0n);
      return {
        categoryId: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon as IconName,
        amount,
        percent: percentOf(amount, total) ?? 0,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'pt-BR'));
  return { month, total, items };
}

/**
 * Day-by-day net movement of the scope's accounts in [start, end). Transfers between two accounts
 * of the scope cancel out; a transfer to or from an account outside it counts.
 */
async function dailyMovements(
  db: Db,
  userId: string,
  scope: BalanceScope,
  start: string,
  end: string,
): Promise<Map<string, bigint>> {
  const accounts = { in: scope.accountIds };
  const date = { gte: start, lt: end };
  const [outgoing, incoming] = await Promise.all([
    db.transaction.groupBy({
      by: ['date', 'type'],
      where: { userId, accountId: accounts, date },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ['date'],
      where: { userId, type: 'transfer', toAccountId: accounts, date },
      _sum: { amount: true },
    }),
  ]);
  const movements = new Map<string, bigint>();
  const add = (day: string, amount: bigint) =>
    movements.set(day, (movements.get(day) ?? 0n) + amount);
  for (const row of outgoing) {
    const amount = sumOrZero(row._sum.amount);
    add(row.date, row.type === 'income' ? amount : -amount);
  }
  for (const row of incoming) add(row.date, sumOrZero(row._sum.amount));
  return movements;
}

/**
 * Running total balance: the balance before `from` (initial balances + earlier movements) plus
 * each day's net movement. Days or months without movement repeat the previous value.
 */
export async function balanceHistory(
  db: Db,
  userId: string,
  {
    from,
    to,
    granularity = 'month',
    accountId,
  }: {
    from: MonthKey;
    to: MonthKey;
    granularity?: Granularity | undefined;
    accountId?: string | undefined;
  },
): Promise<BalanceHistory> {
  assertRange(from, to, granularity);
  const scope = await balanceScope(db, userId, accountId);
  const start = `${from}-01`;
  const [opening, movements] = await Promise.all([
    balanceBefore(db, userId, scope, start),
    dailyMovements(db, userId, scope, start, monthDateRange(to).end),
  ]);
  const months = monthsBetween(from, to);
  let running = opening;

  if (granularity === 'day') {
    const points = months.flatMap(daysOfMonth).map((day) => {
      running += movements.get(day) ?? 0n;
      return { date: day, balance: fromDbCents(running) };
    });
    return { granularity, points };
  }

  const byMonth = new Map<string, bigint>();
  for (const [day, amount] of movements) {
    const month = day.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0n) + amount);
  }
  const points = months.map((month) => {
    running += byMonth.get(month) ?? 0n;
    return { date: month, balance: fromDbCents(running) };
  });
  return { granularity, points };
}

export async function budgetVsActual(
  db: Db,
  userId: string,
  month: MonthKey,
): Promise<BudgetVsActual> {
  const budgets = await db.budget.findMany({
    where: { userId, month },
    include: { category: { select: { name: true, color: true } } },
    orderBy: [{ category: { name: 'asc' } }, { createdAt: 'asc' }],
  });
  const actual = await expensesByCategory(db, userId, month, {
    categoryIds: budgets.map((budget) => budget.categoryId),
  });

  const totals = { budgeted: 0n, actual: 0n };
  const items = budgets.map((budget) => {
    const spent = actual.get(budget.categoryId) ?? 0n;
    totals.budgeted += budget.amount;
    totals.actual += spent;
    const budgeted = fromDbCents(budget.amount);
    const actualCents = fromDbCents(spent);
    return {
      categoryId: budget.categoryId,
      name: budget.category.name,
      color: budget.category.color,
      budgeted,
      actual: actualCents,
      remaining: fromDbCents(budget.amount - spent),
      percentUsed: percentOf(actualCents, budgeted) ?? 0,
    };
  });

  return {
    month,
    items,
    totals: {
      budgeted: fromDbCents(totals.budgeted),
      actual: fromDbCents(totals.actual),
      remaining: fromDbCents(totals.budgeted - totals.actual),
    },
  };
}
