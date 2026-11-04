import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accountSchema, categorySchema } from '@financas/shared';
import type { App } from '../app';
import { authHeader, createTestApp, errorOf, registerUser, type TestUser } from './helpers';

describe('isolamento entre usuários', () => {
  let app: App;
  let alice: TestUser;
  let bob: TestUser;
  let aliceAccountId: string;
  let aliceCategoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    [alice, bob] = await Promise.all([registerUser(app), registerUser(app)]);

    const account = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: authHeader(alice),
      payload: { name: 'Conta da Alice', type: 'checking', color: '#111111', icon: 'landmark' },
    });
    aliceAccountId = accountSchema.parse(account.json()).id;

    const category = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: authHeader(alice),
      payload: { name: 'Só da Alice', kind: 'expense', color: '#222222', icon: 'gift' },
    });
    aliceCategoryId = categorySchema.parse(category.json()).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const asBob = (method: 'GET' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: authHeader(bob), ...(payload && { payload }) });

  it('B não vê contas nem categorias de A nas listagens', async () => {
    const accounts = accountSchema
      .array()
      .parse((await asBob('GET', '/accounts?includeArchived=true')).json());
    const categories = categorySchema.array().parse((await asBob('GET', '/categories')).json());

    expect(accounts.map((a) => a.id)).not.toContain(aliceAccountId);
    expect(accounts.map((a) => a.name)).toEqual(['Carteira']);
    expect(categories.map((c) => c.id)).not.toContain(aliceCategoryId);
    expect(categories.map((c) => c.name)).not.toContain('Só da Alice');
  });

  it.each([
    ['GET', 'conta', () => `/accounts/${aliceAccountId}`, undefined],
    ['PATCH', 'conta', () => `/accounts/${aliceAccountId}`, { name: 'Hackeada' }],
    ['DELETE', 'conta', () => `/accounts/${aliceAccountId}`, undefined],
    ['GET', 'categoria', () => `/categories/${aliceCategoryId}`, undefined],
    ['PATCH', 'categoria', () => `/categories/${aliceCategoryId}`, { name: 'Hackeada' }],
    ['DELETE', 'categoria', () => `/categories/${aliceCategoryId}`, undefined],
  ] as const)('%s em %s de A responde 404 (nunca 403)', async (method, label, url, payload) => {
    const response = await asBob(method, url(), payload);

    expect(response.statusCode).toBe(404);
    expect(errorOf(response).message).toBe(
      label === 'conta' ? 'Conta não encontrada' : 'Categoria não encontrada',
    );
  });

  it('os dados de A continuam intactos depois das tentativas de B', async () => {
    const account = await app.inject({
      method: 'GET',
      url: `/accounts/${aliceAccountId}`,
      headers: authHeader(alice),
    });
    const category = await app.inject({
      method: 'GET',
      url: `/categories/${aliceCategoryId}`,
      headers: authHeader(alice),
    });

    expect(account.json()).toMatchObject({ name: 'Conta da Alice', archived: false });
    expect(category.json()).toMatchObject({ name: 'Só da Alice' });
  });

  it('o banco rejeita transação de B apontando para conta ou categoria de A', async () => {
    const bobAccount = await app.prisma.account.findFirstOrThrow({
      where: { userId: bob.user.id },
    });
    const base = { userId: bob.user.id, amount: 100, date: '2026-11-04', description: 'x' };

    await expect(
      app.prisma.transaction.create({
        data: { ...base, type: 'transfer', accountId: bobAccount.id, toAccountId: aliceAccountId },
      }),
    ).rejects.toThrow();
    await expect(
      app.prisma.transaction.create({
        data: { ...base, type: 'expense', accountId: bobAccount.id, categoryId: aliceCategoryId },
      }),
    ).rejects.toThrow();
  });
});
