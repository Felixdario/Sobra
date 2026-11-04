import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accountSchema } from '@financas/shared';
import type { App } from '../../app';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';

describe('/accounts', () => {
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

  const createAccount = async (overrides: object = {}) => {
    const response = await api('POST', '/accounts', {
      name: 'Banco',
      type: 'checking',
      initialBalance: 10_000,
      color: '#112233',
      icon: 'landmark',
      ...overrides,
    });
    expect(response.statusCode).toBe(201);
    return accountSchema.parse(response.json());
  };

  async function addTransaction(data: {
    type: 'income' | 'expense' | 'transfer';
    accountId: string;
    toAccountId?: string;
    amount: number;
  }) {
    const category = await app.prisma.category.findFirstOrThrow({
      where: { userId: user.user.id, kind: data.type === 'income' ? 'income' : 'expense' },
    });
    await app.prisma.transaction.create({
      data: {
        userId: user.user.id,
        description: 'Teste',
        date: '2026-11-04',
        ...data,
        ...(data.type !== 'transfer' && { categoryId: category.id }),
      },
    });
  }

  it('cria e detalha uma conta com saldo igual ao saldo inicial', async () => {
    const created = await createAccount({ color: '#abcdef' });

    expect(created).toMatchObject({
      name: 'Banco',
      type: 'checking',
      initialBalance: 10_000,
      balance: 10_000,
      color: '#ABCDEF',
      archived: false,
    });
    const fetched = await api('GET', `/accounts/${created.id}`);
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(created);
  });

  it('valida o corpo (centavos inteiros, tipo e ícone)', async () => {
    const response = await api('POST', '/accounts', {
      name: 'X',
      type: 'investimento',
      initialBalance: 10.5,
      color: 'azul',
      icon: 'rocket',
    });

    expect(response.statusCode).toBe(400);
    const fields = (errorOf(response).details as { field: string }[]).map((issue) => issue.field);
    expect(fields).toEqual(expect.arrayContaining(['type', 'initialBalance', 'color', 'icon']));
  });

  it('suporta valores grandes: R$ 1 bilhão e somas acima de 2^31 centavos', async () => {
    const big = await createAccount({ initialBalance: 100_000_000_000 });
    expect(big).toMatchObject({ initialBalance: 100_000_000_000, balance: 100_000_000_000 });

    const other = await createAccount({ initialBalance: 0 });
    await addTransaction({ type: 'income', accountId: big.id, amount: 2_000_000_000 });
    await addTransaction({ type: 'income', accountId: big.id, amount: 2_000_000_000 });
    await addTransaction({ type: 'expense', accountId: big.id, amount: 1_500_000_000 });
    await addTransaction({
      type: 'transfer',
      accountId: big.id,
      toAccountId: other.id,
      amount: 3_000_000_000,
    });

    const list = accountSchema.array().parse((await api('GET', '/accounts')).json());
    const byId = new Map(list.map((account) => [account.id, account.balance]));
    expect(byId.get(big.id)).toBe(100_000_000_000 + 4_000_000_000 - 1_500_000_000 - 3_000_000_000);
    expect(byId.get(other.id)).toBe(3_000_000_000);

    const stored = await app.prisma.account.findUniqueOrThrow({ where: { id: big.id } });
    expect(stored.initialBalance).toBe(100_000_000_000n);
  });

  it('recusa valor acima do inteiro seguro com 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { ...authHeader(user), 'content-type': 'application/json' },
      payload:
        '{"name":"X","type":"cash","color":"#000000","icon":"wallet","initialBalance":9007199254740993}',
    });

    expect(response.statusCode).toBe(400);
    expect(errorOf(response).details).toEqual([
      expect.objectContaining({ field: 'initialBalance', in: 'body' }),
    ]);
  });

  it('calcula o saldo com receitas, despesas e transferências', async () => {
    const checking = await createAccount({ initialBalance: 100_000 });
    const savings = await createAccount({ name: 'Poupança', type: 'savings', initialBalance: 0 });

    await addTransaction({ type: 'income', accountId: checking.id, amount: 50_000 });
    await addTransaction({ type: 'expense', accountId: checking.id, amount: 12_345 });
    await addTransaction({
      type: 'transfer',
      accountId: checking.id,
      toAccountId: savings.id,
      amount: 30_000,
    });

    const list = accountSchema.array().parse((await api('GET', '/accounts')).json());
    const byId = new Map(list.map((account) => [account.id, account.balance]));
    expect(byId.get(checking.id)).toBe(100_000 + 50_000 - 12_345 - 30_000);
    expect(byId.get(savings.id)).toBe(30_000);

    const single = accountSchema.parse((await api('GET', `/accounts/${savings.id}`)).json());
    expect(single.balance).toBe(30_000);
  });

  it('atualiza parcialmente e exige ao menos um campo', async () => {
    const account = await createAccount();
    const updated = await api('PATCH', `/accounts/${account.id}`, {
      name: 'Banco Novo',
      initialBalance: 500,
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ name: 'Banco Novo', initialBalance: 500, balance: 500 });

    const empty = await api('PATCH', `/accounts/${account.id}`, {});
    expect(empty.statusCode).toBe(400);
    expect(errorOf(empty).details).toEqual([
      { field: '', in: 'body', message: 'Informe ao menos um campo para atualizar' },
    ]);
  });

  it('exclui conta sem movimentações (204)', async () => {
    const account = await createAccount();

    const response = await api('DELETE', `/accounts/${account.id}`);
    expect(response.statusCode).toBe(204);
    expect((await api('GET', `/accounts/${account.id}`)).statusCode).toBe(404);
  });

  it('arquiva em vez de excluir quando há movimentações', async () => {
    const account = await createAccount();
    await addTransaction({ type: 'expense', accountId: account.id, amount: 1_000 });

    const response = await api('DELETE', `/accounts/${account.id}`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: account.id, archived: true, balance: 9_000 });

    const active = accountSchema.array().parse((await api('GET', '/accounts')).json());
    expect(active.map((a) => a.id)).not.toContain(account.id);

    const all = accountSchema
      .array()
      .parse((await api('GET', '/accounts?includeArchived=true')).json());
    expect(all.find((a) => a.id === account.id)?.archived).toBe(true);

    const restored = await api('PATCH', `/accounts/${account.id}`, { archived: false });
    expect(restored.json()).toMatchObject({ archived: false });
  });

  it('conta destino de transferência também é arquivada em vez de excluída', async () => {
    const from = await createAccount();
    const to = await createAccount();
    await addTransaction({ type: 'transfer', accountId: from.id, toAccountId: to.id, amount: 1 });

    expect((await api('DELETE', `/accounts/${to.id}`)).statusCode).toBe(200);
  });

  it('responde 404 para id inexistente e 400 para id malformado', async () => {
    const missing = await api('GET', '/accounts/0198f1c2-0000-7000-8000-000000000000');
    expect(missing.statusCode).toBe(404);
    expect(errorOf(missing)).toEqual({ code: 'NOT_FOUND', message: 'Conta não encontrada' });

    const malformed = await api('GET', '/accounts/123');
    expect(malformed.statusCode).toBe(400);
    expect(errorOf(malformed).details).toEqual([
      { field: 'id', in: 'params', message: 'Identificador inválido' },
    ]);
  });

  it('exige autenticação', async () => {
    const response = await app.inject({ method: 'GET', url: '/accounts' });
    expect(response.statusCode).toBe(401);
  });
});
