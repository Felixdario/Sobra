import { cents } from '@financas/shared';
import type { App } from '../app';
import { toDbCents } from '../lib/money';

type TransactionSeed = {
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  amount: number;
  date: string;
  categoryId?: string;
  toAccountId?: string;
  description?: string;
};

/** Inserts transactions straight through Prisma, without depending on the transactions routes. */
export async function seedTransactions(app: App, userId: string, rows: TransactionSeed[]) {
  await app.prisma.transaction.createMany({
    data: rows.map(({ amount, description = 'Teste', ...row }) => ({
      ...row,
      userId,
      description,
      amount: toDbCents(cents(amount)),
    })),
  });
}

export async function createAccountRow(
  app: App,
  userId: string,
  { name = 'Banco', initialBalance = 0, archived = false } = {},
) {
  return app.prisma.account.create({
    data: {
      userId,
      name,
      type: 'checking',
      color: '#112233',
      icon: 'landmark',
      archived,
      initialBalance: toDbCents(cents(initialBalance)),
    },
  });
}

/** The default category of `userId` with that name (registerUser seeds them). */
export async function categoryByName(app: App, userId: string, name: string) {
  return app.prisma.category.findFirstOrThrow({ where: { userId, name } });
}

export async function defaultAccount(app: App, userId: string) {
  return app.prisma.account.findFirstOrThrow({ where: { userId, name: 'Carteira' } });
}
