import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categorySchema } from '@sobra/shared';
import type { App } from '../../app';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';

describe('/categories', () => {
  let app: App;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    user = await registerUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: authHeader(user), ...(payload && { payload }) });

  const createCategory = async (overrides: object = {}) => {
    const response = await api('POST', '/categories', {
      name: `Pets ${Math.random()}`,
      kind: 'expense',
      color: '#d97706',
      icon: 'paw',
      ...overrides,
    });
    expect(response.statusCode).toBe(201);
    return categorySchema.parse(response.json());
  };

  it('cria, detalha, atualiza e exclui', async () => {
    const created = await createCategory({ name: 'Pets' });
    expect(created).toMatchObject({ name: 'Pets', kind: 'expense', color: '#D97706', icon: 'paw' });

    expect((await api('GET', `/categories/${created.id}`)).json()).toEqual(created);

    const updated = await api('PATCH', `/categories/${created.id}`, {
      name: 'Animais',
      icon: 'heart-pulse',
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ name: 'Animais', icon: 'heart-pulse', kind: 'expense' });

    expect((await api('DELETE', `/categories/${created.id}`)).statusCode).toBe(204);
    expect((await api('GET', `/categories/${created.id}`)).statusCode).toBe(404);
  });

  it('filtra por tipo', async () => {
    const income = categorySchema
      .array()
      .parse((await api('GET', '/categories?kind=income')).json());
    expect(income.length).toBeGreaterThan(0);
    expect(income.every((category) => category.kind === 'income')).toBe(true);

    const invalid = await api('GET', '/categories?kind=outro');
    expect(invalid.statusCode).toBe(400);
  });

  it('recusa nome duplicado no mesmo tipo com 409, mas aceita em tipo diferente', async () => {
    const duplicate = await api('POST', '/categories', {
      name: 'Mercado',
      kind: 'expense',
      color: '#000000',
      icon: 'cart',
    });
    expect(duplicate.statusCode).toBe(409);
    expect(errorOf(duplicate).message).toBe('Já existe uma categoria de despesa com esse nome');

    await createCategory({ name: 'Mercado', kind: 'income' });

    const other = await createCategory({ name: 'Outra' });
    const rename = await api('PATCH', `/categories/${other.id}`, { name: 'Moradia' });
    expect(rename.statusCode).toBe(409);
  });

  it('não exclui categoria em uso (409 em pt-BR)', async () => {
    const category = await createCategory();
    const account = await app.prisma.account.findFirstOrThrow({ where: { userId: user.user.id } });
    await app.prisma.transaction.create({
      data: {
        userId: user.user.id,
        type: 'expense',
        accountId: account.id,
        categoryId: category.id,
        amount: 2_500,
        date: '2026-11-04',
        description: 'Ração',
      },
    });

    const response = await api('DELETE', `/categories/${category.id}`);
    expect(response.statusCode).toBe(409);
    expect(errorOf(response)).toEqual({
      code: 'CONFLICT',
      message:
        'Esta categoria está em uso por transações, orçamentos ou recorrências e não pode ser excluída',
      details: { transactions: 1, budgets: 0, recurringRules: 0 },
    });
  });

  it('não exclui categoria com orçamento', async () => {
    const category = await createCategory();
    await app.prisma.budget.create({
      data: { userId: user.user.id, categoryId: category.id, month: '2026-11', amount: 10_000 },
    });

    expect((await api('DELETE', `/categories/${category.id}`)).statusCode).toBe(409);
  });

  it('não permite trocar o tipo', async () => {
    const category = await createCategory();
    const response = await api('PATCH', `/categories/${category.id}`, { kind: 'income' });

    expect(response.statusCode).toBe(400);
  });
});
