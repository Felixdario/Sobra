import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { budgetSchema } from '@financas/shared';
import type { App } from '../../app';
import { categoryByName, defaultAccount, seedTransactions } from '../../test/factories';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';

describe('/budgets', () => {
  let app: App;
  let alice: TestUser;
  let bob: TestUser;
  let mercado: string;
  let lazer: string;
  let salario: string;

  beforeAll(async () => {
    app = await createTestApp();
    [alice, bob] = await Promise.all([registerUser(app), registerUser(app)]);
    const id = alice.user.id;
    [mercado, lazer, salario] = await Promise.all([
      categoryByName(app, id, 'Mercado').then((category) => category.id),
      categoryByName(app, id, 'Lazer').then((category) => category.id),
      categoryByName(app, id, 'Salário').then((category) => category.id),
    ]);
    const account = (await defaultAccount(app, id)).id;
    await seedTransactions(app, id, [
      {
        type: 'expense',
        accountId: account,
        categoryId: mercado,
        amount: 30_000,
        date: '2026-11-01',
      },
      {
        type: 'expense',
        accountId: account,
        categoryId: mercado,
        amount: 25_000,
        date: '2026-11-30',
      },
      {
        type: 'expense',
        accountId: account,
        categoryId: mercado,
        amount: 99_999,
        date: '2026-12-01',
      },
      {
        type: 'expense',
        accountId: account,
        categoryId: mercado,
        amount: 88_888,
        date: '2026-10-31',
      },
      {
        type: 'income',
        accountId: account,
        categoryId: salario,
        amount: 500_000,
        date: '2026-11-05',
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = (
    user: TestUser,
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    url: string,
    payload?: object,
  ) => app.inject({ method, url, headers: authHeader(user), ...(payload && { payload }) });

  const list = async (user: TestUser, month: string) => {
    const response = await api(user, 'GET', `/budgets?month=${month}`);
    expect(response.statusCode).toBe(200);
    return budgetSchema.array().parse(response.json());
  };

  it('PUT cria e é idempotente por categoria+mês; spent soma só despesas do mês', async () => {
    const first = await api(alice, 'PUT', '/budgets', {
      categoryId: mercado,
      month: '2026-11',
      amount: 50_000,
    });
    expect(first.statusCode).toBe(200);
    const created = budgetSchema.parse(first.json());
    expect(created).toMatchObject({ amount: 50_000, spent: 55_000, remaining: -5_000 });

    const second = budgetSchema.parse(
      (
        await api(alice, 'PUT', '/budgets', {
          categoryId: mercado,
          month: '2026-11',
          amount: 60_000,
        })
      ).json(),
    );
    expect(second).toMatchObject({ id: created.id, amount: 60_000, remaining: 5_000 });

    const budgets = await list(alice, '2026-11');
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toMatchObject({ id: created.id, spent: 55_000, remaining: 5_000 });
  });

  it('categoria de receita responde 400 em pt-BR', async () => {
    const response = await api(alice, 'PUT', '/budgets', {
      categoryId: salario,
      month: '2026-11',
      amount: 1_000,
    });
    expect(response.statusCode).toBe(400);
    expect(errorOf(response).message).toBe(
      'Orçamentos só podem ser definidos para categorias de despesa',
    );
  });

  it('mês inválido responde 400', async () => {
    expect((await api(alice, 'GET', '/budgets?month=2026-13')).statusCode).toBe(400);
  });

  it('POST /copy copia sem sobrescrever os orçamentos do destino', async () => {
    await api(alice, 'PUT', '/budgets', { categoryId: lazer, month: '2026-11', amount: 20_000 });
    await api(alice, 'PUT', '/budgets', { categoryId: lazer, month: '2026-12', amount: 5_000 });

    const response = await api(alice, 'POST', '/budgets/copy', { from: '2026-11', to: '2026-12' });
    expect(response.statusCode).toBe(200);
    const copied = budgetSchema.array().parse(response.json());

    const byCategory = new Map(copied.map((budget) => [budget.categoryId, budget]));
    expect(copied).toHaveLength(2);
    expect(byCategory.get(lazer)).toMatchObject({ amount: 5_000, month: '2026-12' });
    expect(byCategory.get(mercado)).toMatchObject({
      amount: 60_000,
      month: '2026-12',
      spent: 99_999,
    });

    const again = budgetSchema
      .array()
      .parse(
        (await api(alice, 'POST', '/budgets/copy', { from: '2026-11', to: '2026-12' })).json(),
      );
    expect(again).toHaveLength(2);
  });

  it('POST /copy com o mesmo mês responde 400', async () => {
    const response = await api(alice, 'POST', '/budgets/copy', { from: '2026-11', to: '2026-11' });
    expect(response.statusCode).toBe(400);
  });

  describe('isolamento', () => {
    it('B não vê os orçamentos de A e não usa a categoria de A', async () => {
      expect(await list(bob, '2026-11')).toEqual([]);
      const response = await api(bob, 'PUT', '/budgets', {
        categoryId: mercado,
        month: '2026-11',
        amount: 1_000,
      });
      expect(response.statusCode).toBe(404);
      expect(errorOf(response).message).toBe('Categoria não encontrada');
    });

    it('B não copia nem exclui orçamentos de A', async () => {
      const copied = await api(bob, 'POST', '/budgets/copy', { from: '2026-11', to: '2027-01' });
      expect(budgetSchema.array().parse(copied.json())).toEqual([]);

      const [budget] = await list(alice, '2026-11');
      const response = await api(bob, 'DELETE', `/budgets/${budget?.id}`);
      expect(response.statusCode).toBe(404);
      expect(errorOf(response).message).toBe('Orçamento não encontrado');
      expect(await list(alice, '2026-11')).toHaveLength(2);
    });

    it('spent de B ignora as despesas de A na mesma categoria-nome', async () => {
      const bobMercado = await categoryByName(app, bob.user.id, 'Mercado');
      const budget = budgetSchema.parse(
        (
          await api(bob, 'PUT', '/budgets', {
            categoryId: bobMercado.id,
            month: '2026-11',
            amount: 10_000,
          })
        ).json(),
      );
      expect(budget).toMatchObject({ spent: 0, remaining: 10_000 });
    });
  });

  it('DELETE exclui e depois responde 404', async () => {
    const [budget] = await list(alice, '2026-12');
    const url = `/budgets/${budget?.id}`;
    expect((await api(alice, 'DELETE', url)).statusCode).toBe(204);
    expect((await api(alice, 'DELETE', url)).statusCode).toBe(404);
    expect(await list(alice, '2026-12')).toHaveLength(1);
  });
});
