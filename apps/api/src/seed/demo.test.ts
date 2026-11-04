import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountSchema,
  authResponseSchema,
  budgetSchema,
  incomeVsExpenseSeriesSchema,
  monthSummarySchema,
} from '@financas/shared';
import type { App } from '../app';
import { authHeader, createTestApp, registerUser } from '../test/helpers';
import { DEMO_USER, seedDemo } from './demo';

const TODAY = '2026-11-04';
const SEED_TIMEOUT = 60_000;
const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

describe('seed do usuário demo', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginDemo() {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: DEMO_USER.email, password: DEMO_USER.password },
    });
    expect(response.statusCode, response.body).toBe(200);
    const auth = authResponseSchema.parse(response.json());
    const get = async (url: string) => {
      const result = await app.inject({ method: 'GET', url, headers: authHeader(auth) });
      expect(result.statusCode, result.body).toBe(200);
      return result.json();
    };
    return { userId: auth.user.id, get };
  }

  const snapshot = () =>
    app.prisma.transaction.findMany({
      where: { user: { email: DEMO_USER.email } },
      select: { date: true, type: true, amount: true, description: true },
      orderBy: [{ date: 'asc' }, { description: 'asc' }, { amount: 'asc' }, { type: 'asc' }],
    });

  it(
    'gera 6 meses com receitas e despesas que a API soma igual ao banco',
    async () => {
      const summary = await seedDemo(app.prisma, { today: TODAY });
      const { userId, get } = await loginDemo();

      const series = incomeVsExpenseSeriesSchema.parse(
        await get(`/summary/income-vs-expense?from=${MONTHS[0]}&to=${MONTHS.at(-1)}`),
      );
      expect(series.points.map((point) => point.month)).toEqual(MONTHS);

      const rows = await app.prisma.transaction.groupBy({
        by: ['date', 'type'],
        where: { userId },
        _sum: { amount: true },
        _count: true,
      });
      const fromDb = new Map(MONTHS.map((month) => [month, { income: 0, expense: 0, count: 0 }]));
      for (const row of rows) {
        const bucket = fromDb.get(row.date.slice(0, 7));
        if (!bucket) throw new Error(`Transação fora dos 6 meses: ${row.date}`);
        bucket.count += row._count;
        if (row.type !== 'transfer') bucket[row.type] += Number(row._sum.amount ?? 0n);
      }

      for (const point of series.points) {
        const db = fromDb.get(point.month);
        expect(point.income).toBeGreaterThan(0);
        expect(point.expense).toBeGreaterThan(0);
        expect(db?.count).toBeGreaterThan(0);
        expect({ income: point.income, expense: point.expense }).toEqual({
          income: db?.income,
          expense: db?.expense,
        });
      }
      expect(summary.months.map((month) => month.transactions)).toEqual(
        MONTHS.map((month) => fromDb.get(month)?.count),
      );
      expect(await app.prisma.transaction.count({ where: { userId, date: { gt: TODAY } } })).toBe(
        0,
      );

      const rates = series.points.slice(0, -1).map((point) => (point.net / point.income) * 100);
      for (const rate of rates) {
        expect(rate).toBeGreaterThanOrEqual(4);
        expect(rate).toBeLessThanOrEqual(26);
      }
      expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(10);

      const current = monthSummarySchema.parse(await get('/summary/month?month=2026-11'));
      expect(current.income).toBeGreaterThan(0);
      expect(current.balance).toBe(summary.totalBalance);
      expect(summary.current).toEqual({
        month: '2026-11',
        income: current.income,
        expense: current.expense,
      });

      const accounts = accountSchema.array().parse(await get('/accounts'));
      expect(accounts.map((account) => [account.name, account.type])).toEqual(
        expect.arrayContaining([
          ['Nubank', 'checking'],
          ['Poupança Caixa', 'savings'],
          ['Cartão Inter', 'credit_card'],
          ['Carteira', 'cash'],
        ]),
      );
      expect(accounts.find((account) => account.type === 'credit_card')?.balance).toBeLessThan(0);

      const budgets = await Promise.all(
        MONTHS.map(async (month) =>
          budgetSchema.array().parse(await get(`/budgets?month=${month}`)),
        ),
      );
      expect(budgets.map((list) => list.length)).toEqual(MONTHS.map(() => 7));
      const complete = budgets.slice(0, -1).flat();
      expect(complete.some((budget) => budget.remaining < 0)).toBe(true);
      expect(complete.some((budget) => budget.spent < budget.amount * 0.7)).toBe(true);

      const rules = await app.prisma.recurringRule.findMany({ where: { userId } });
      expect(rules.map((rule) => rule.description)).toEqual(
        expect.arrayContaining(['Netflix', 'Spotify', 'iCloud+ 200 GB', 'Smart Fit — mensalidade']),
      );
      const netflix = await app.prisma.transaction.findMany({
        where: { userId, description: 'Netflix' },
        select: { date: true, amount: true, recurringRuleId: true },
      });
      expect(netflix.map((row) => row.date)).toEqual(MONTHS.slice(0, -1).map((m) => `${m}-12`));
      expect(netflix.every((row) => row.amount === 5_590n && row.recurringRuleId !== null)).toBe(
        true,
      );
    },
    SEED_TIMEOUT,
  );

  it(
    'rodar de novo recria o demo igual, sem duplicar e sem tocar em outros usuários',
    async () => {
      const other = await registerUser(app);
      const before = await snapshot();

      await seedDemo(app.prisma, { today: TODAY });

      expect(await app.prisma.user.count({ where: { email: DEMO_USER.email } })).toBe(1);
      expect(await snapshot()).toEqual(before);
      expect(await app.prisma.category.count({ where: { userId: other.user.id } })).toBeGreaterThan(
        0,
      );
      expect(await app.prisma.account.count({ where: { userId: other.user.id } })).toBe(1);
    },
    SEED_TIMEOUT,
  );

  it(
    'no dia 1º e na virada do ano também há receita em todos os meses',
    async () => {
      await seedDemo(app.prisma, { today: '2027-01-01' });
      const { get } = await loginDemo();
      const series = incomeVsExpenseSeriesSchema.parse(
        await get('/summary/income-vs-expense?from=2026-08&to=2027-01'),
      );
      expect(series.points.map((point) => point.month)).toEqual([
        '2026-08',
        '2026-09',
        '2026-10',
        '2026-11',
        '2026-12',
        '2027-01',
      ]);
      expect(series.points.every((point) => point.income > 0)).toBe(true);
    },
    SEED_TIMEOUT,
  );
});
