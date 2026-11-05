import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  balanceHistorySchema,
  budgetVsActualSchema,
  incomeVsExpenseSeriesSchema,
  monthSummarySchema,
  spendingByCategorySchema,
} from '@financas/shared';
import type { App } from '../../app';
import {
  categoryByName,
  createAccountRow,
  defaultAccount,
  seedTransactions,
} from '../../test/factories';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';

describe('/summary', () => {
  let app: App;
  let alice: TestUser;
  let bob: TestUser;
  let bank: string;
  let mercado: string;
  let lazer: string;

  beforeAll(async () => {
    app = await createTestApp();
    [alice, bob] = await Promise.all([registerUser(app), registerUser(app)]);
    const id = alice.user.id;
    const wallet = (await defaultAccount(app, id)).id;
    bank = (await createAccountRow(app, id, { name: 'Banco', initialBalance: 100_000 })).id;
    const archived = await createAccountRow(app, id, {
      name: 'Antiga',
      initialBalance: 70_000,
      archived: true,
    });
    mercado = (await categoryByName(app, id, 'Mercado')).id;
    lazer = (await categoryByName(app, id, 'Lazer')).id;
    const salario = (await categoryByName(app, id, 'Salário')).id;

    await seedTransactions(app, id, [
      { type: 'income', accountId: bank, categoryId: salario, amount: 500_000, date: '2026-11-05' },
      {
        type: 'expense',
        accountId: wallet,
        categoryId: mercado,
        amount: 30_000,
        date: '2026-11-01',
      },
      // 30/11 às 23h em São Paulo já é 01/12 em UTC; `date` guarda o dia local, então é novembro.
      { type: 'expense', accountId: wallet, categoryId: lazer, amount: 20_000, date: '2026-11-30' },
      {
        type: 'expense',
        accountId: wallet,
        categoryId: mercado,
        amount: 10_000,
        date: '2026-12-01',
      },
      {
        type: 'transfer',
        accountId: bank,
        toAccountId: wallet,
        amount: 40_000,
        date: '2026-11-10',
      },
      {
        type: 'income',
        accountId: archived.id,
        categoryId: salario,
        amount: 1,
        date: '2026-08-01',
      },
    ]);
    await app.prisma.budget.create({
      data: { userId: id, categoryId: mercado, month: '2026-11', amount: 40_000n },
    });

    const bobId = bob.user.id;
    await seedTransactions(app, bobId, [
      {
        type: 'income',
        accountId: (await defaultAccount(app, bobId)).id,
        categoryId: (await categoryByName(app, bobId, 'Freelance')).id,
        amount: 1_000,
        date: '2026-11-15',
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (user: TestUser, url: string) =>
    app.inject({ method: 'GET', url, headers: authHeader(user) });

  const getOk = async (user: TestUser, url: string) => {
    const response = await get(user, url);
    expect(response.statusCode, response.body).toBe(200);
    return response.json() as unknown;
  };

  describe('GET /summary/month', () => {
    it('soma receitas e despesas do mês, sem transferências, e compara com o mês anterior', async () => {
      const summary = monthSummarySchema.parse(await getOk(alice, '/summary/month?month=2026-11'));

      expect(summary).toEqual({
        month: '2026-11',
        income: 500_000,
        expense: 50_000,
        balance: 550_000,
        savingsRate: 90,
        previous: { month: '2026-10', income: 0, expense: 0, balance: 100_000 },
        delta: {
          income: { absolute: 500_000, percent: null },
          expense: { absolute: 50_000, percent: null },
          balance: { absolute: 450_000, percent: 450 },
        },
      });
    });

    it('a despesa de 01/12 fica em dezembro', async () => {
      const summary = monthSummarySchema.parse(await getOk(alice, '/summary/month?month=2026-12'));
      expect(summary).toMatchObject({ income: 0, expense: 10_000, balance: 540_000 });
      expect(summary.savingsRate).toBeNull();
      expect(summary.delta.expense).toEqual({ absolute: -40_000, percent: -80 });
    });

    it('filtra por conta: transferência só move o saldo', async () => {
      const summary = monthSummarySchema.parse(
        await getOk(alice, `/summary/month?month=2026-11&accountId=${bank}`),
      );
      expect(summary).toMatchObject({ income: 500_000, expense: 0, balance: 560_000 });
    });
  });

  it('GET /summary/income-vs-expense inclui meses vazios com zero', async () => {
    const series = incomeVsExpenseSeriesSchema.parse(
      await getOk(alice, '/summary/income-vs-expense?from=2026-09&to=2026-12'),
    );
    expect(series.points).toEqual([
      { month: '2026-09', income: 0, expense: 0, net: 0 },
      { month: '2026-10', income: 0, expense: 0, net: 0 },
      { month: '2026-11', income: 500_000, expense: 50_000, net: 450_000 },
      { month: '2026-12', income: 0, expense: 10_000, net: -10_000 },
    ]);
  });

  it('GET /summary/spending-by-category ordena desc com nome, cor, ícone e percentual', async () => {
    const spending = spendingByCategorySchema.parse(
      await getOk(alice, '/summary/spending-by-category?month=2026-11'),
    );
    expect(spending.total).toBe(50_000);
    expect(spending.items).toEqual([
      expect.objectContaining({
        categoryId: mercado,
        name: 'Mercado',
        color: '#D06A1F',
        icon: 'cart',
        amount: 30_000,
        percent: 60,
      }),
      expect.objectContaining({ categoryId: lazer, name: 'Lazer', amount: 20_000, percent: 40 }),
    ]);
  });

  describe('GET /summary/balance-history', () => {
    it('mensal: acumula o saldo inicial das contas não arquivadas', async () => {
      const history = balanceHistorySchema.parse(
        await getOk(alice, '/summary/balance-history?from=2026-10&to=2027-01&granularity=month'),
      );
      expect(history).toEqual({
        granularity: 'month',
        points: [
          { date: '2026-10', balance: 100_000 },
          { date: '2026-11', balance: 550_000 },
          { date: '2026-12', balance: 540_000 },
          { date: '2027-01', balance: 540_000 },
        ],
      });
    });

    it('diário: dias sem movimento repetem o valor anterior', async () => {
      const history = balanceHistorySchema.parse(
        await getOk(alice, '/summary/balance-history?from=2026-11&to=2026-11&granularity=day'),
      );
      const byDay = new Map(history.points.map((point) => [point.date, point.balance]));
      expect(history.points).toHaveLength(30);
      expect(byDay.get('2026-11-01')).toBe(70_000);
      expect(byDay.get('2026-11-04')).toBe(70_000);
      expect(byDay.get('2026-11-05')).toBe(570_000);
      expect(byDay.get('2026-11-10')).toBe(570_000);
      expect(byDay.get('2026-11-30')).toBe(550_000);
    });

    it('usa mês como padrão e limita o período', async () => {
      const history = balanceHistorySchema.parse(
        await getOk(alice, '/summary/balance-history?from=2026-11&to=2026-11'),
      );
      expect(history.granularity).toBe('month');

      const tooLong = await get(
        alice,
        '/summary/balance-history?from=2026-01&to=2027-01&granularity=day',
      );
      expect(tooLong.statusCode).toBe(400);
      expect(errorOf(tooLong).message).toBe(
        'O período deve ter no máximo 12 meses na visão diária',
      );
      expect(
        (await get(alice, '/summary/balance-history?from=2026-12&to=2026-11')).statusCode,
      ).toBe(400);
    });
  });

  it('GET /summary/budget-vs-actual compara orçado e realizado', async () => {
    const report = budgetVsActualSchema.parse(
      await getOk(alice, '/summary/budget-vs-actual?month=2026-11'),
    );
    expect(report).toEqual({
      month: '2026-11',
      items: [
        {
          categoryId: mercado,
          name: 'Mercado',
          color: '#D06A1F',
          budgeted: 40_000,
          actual: 30_000,
          remaining: 10_000,
          percentUsed: 75,
        },
      ],
      totals: { budgeted: 40_000, actual: 30_000, remaining: 10_000 },
    });
  });

  describe('isolamento', () => {
    it('os resumos de B ignoram as transações e orçamentos de A', async () => {
      const summary = monthSummarySchema.parse(await getOk(bob, '/summary/month?month=2026-11'));
      expect(summary).toMatchObject({
        income: 1_000,
        expense: 0,
        balance: 1_000,
        savingsRate: 100,
      });

      const spending = spendingByCategorySchema.parse(
        await getOk(bob, '/summary/spending-by-category?month=2026-11'),
      );
      expect(spending).toEqual({ month: '2026-11', total: 0, items: [] });

      const series = incomeVsExpenseSeriesSchema.parse(
        await getOk(bob, '/summary/income-vs-expense?from=2026-11&to=2026-12'),
      );
      expect(series.points.map((point) => point.expense)).toEqual([0, 0]);

      const history = balanceHistorySchema.parse(
        await getOk(bob, '/summary/balance-history?from=2026-10&to=2026-11'),
      );
      expect(history.points.map((point) => point.balance)).toEqual([0, 1_000]);

      const budgets = budgetVsActualSchema.parse(
        await getOk(bob, '/summary/budget-vs-actual?month=2026-11'),
      );
      expect(budgets.items).toEqual([]);
    });

    it.each([
      'month?month=2026-11',
      'spending-by-category?month=2026-11',
      'income-vs-expense?from=2026-11&to=2026-11',
      'balance-history?from=2026-11&to=2026-11',
    ])('B filtrando pela conta de A em /summary/%s recebe 404', async (path) => {
      const response = await get(bob, `/summary/${path}&accountId=${bank}`);
      expect(response.statusCode).toBe(404);
      expect(errorOf(response).message).toBe('Conta não encontrada');
    });
  });
});
