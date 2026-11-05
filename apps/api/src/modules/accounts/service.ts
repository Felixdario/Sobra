import { type Account, type AccountCreate, type AccountUpdate, type IconName } from '@sobra/shared';
import type { Db } from '../../lib/db';
import { notFound } from '../../lib/errors';
import { fromDbCents, sumOrZero, toDbCents } from '../../lib/money';
import { compact } from '../../lib/objects';
import type { Account as AccountRow } from '../../generated/prisma/client';

const ACCOUNT_NOT_FOUND = 'Conta não encontrada';

const toAccount = (row: AccountRow, movement = 0n): Account => ({
  id: row.id,
  name: row.name,
  type: row.type,
  initialBalance: fromDbCents(row.initialBalance),
  balance: fromDbCents(row.initialBalance + movement),
  color: row.color,
  icon: row.icon as IconName,
  archived: row.archived,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** Loads an account of `userId`; another user's account is reported as missing (404). */
export async function findOwnedAccount(db: Db, userId: string, id: string): Promise<AccountRow> {
  const account = await db.account.findFirst({ where: { id, userId } });
  if (!account) throw notFound(ACCOUNT_NOT_FOUND);
  return account;
}

/**
 * Net movement per account: + income, − expense, − transfers out, + transfers in.
 * Balance = initialBalance + movement. `before` ("YYYY-MM-DD", exclusive) limits it to earlier days.
 */
export async function accountMovements(
  db: Db,
  userId: string,
  accountIds?: string[],
  { before }: { before?: string } = {},
): Promise<Map<string, bigint>> {
  const scope = accountIds ? { in: accountIds } : undefined;
  const period = before !== undefined && { date: { lt: before } };
  const [outgoing, incoming] = await Promise.all([
    db.transaction.groupBy({
      by: ['accountId', 'type'],
      where: { userId, ...period, ...(scope && { accountId: scope }) },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ['toAccountId'],
      where: { userId, ...period, type: 'transfer', toAccountId: scope ?? { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const movements = new Map<string, bigint>();
  const add = (accountId: string, amount: bigint) =>
    movements.set(accountId, (movements.get(accountId) ?? 0n) + amount);

  for (const row of outgoing) {
    const amount = sumOrZero(row._sum.amount);
    add(row.accountId, row.type === 'income' ? amount : -amount);
  }
  for (const row of incoming) {
    if (row.toAccountId) add(row.toAccountId, sumOrZero(row._sum.amount));
  }
  return movements;
}

async function withBalance(db: Db, userId: string, row: AccountRow): Promise<Account> {
  const movements = await accountMovements(db, userId, [row.id]);
  return toAccount(row, movements.get(row.id));
}

export async function listAccounts(
  db: Db,
  userId: string,
  { includeArchived }: { includeArchived: boolean },
): Promise<Account[]> {
  const [rows, movements] = await Promise.all([
    db.account.findMany({
      where: { userId, ...(!includeArchived && { archived: false }) },
      orderBy: [{ archived: 'asc' }, { createdAt: 'asc' }],
    }),
    accountMovements(db, userId),
  ]);
  return rows.map((row) => toAccount(row, movements.get(row.id)));
}

export async function getAccount(db: Db, userId: string, id: string): Promise<Account> {
  return withBalance(db, userId, await findOwnedAccount(db, userId, id));
}

export async function createAccount(
  db: Db,
  userId: string,
  input: AccountCreate,
): Promise<Account> {
  const row = await db.account.create({
    data: { ...input, initialBalance: toDbCents(input.initialBalance), userId },
  });
  return toAccount(row);
}

export async function updateAccount(
  db: Db,
  userId: string,
  id: string,
  input: AccountUpdate,
): Promise<Account> {
  await findOwnedAccount(db, userId, id);
  const { initialBalance, ...rest } = input;
  const row = await db.account.update({
    where: { id },
    data: {
      ...compact(rest),
      ...(initialBalance !== undefined && { initialBalance: toDbCents(initialBalance) }),
    },
  });
  return withBalance(db, userId, row);
}

async function isAccountInUse(db: Db, userId: string, id: string): Promise<boolean> {
  const usage = { userId, OR: [{ accountId: id }, { toAccountId: id }] };
  const [transactions, rules, batches] = await Promise.all([
    db.transaction.count({ where: usage }),
    db.recurringRule.count({ where: usage }),
    db.importBatch.count({ where: { userId, accountId: id } }),
  ]);
  return transactions + rules + batches > 0;
}

/** Deletes an unused account; an account with history is archived instead and returned. */
export async function deleteAccount(
  db: Db,
  userId: string,
  id: string,
): Promise<{ archived: Account } | { deleted: true }> {
  await findOwnedAccount(db, userId, id);
  if (await isAccountInUse(db, userId, id)) {
    const row = await db.account.update({ where: { id }, data: { archived: true } });
    return { archived: await withBalance(db, userId, row) };
  }
  await db.account.delete({ where: { id } });
  return { deleted: true };
}
