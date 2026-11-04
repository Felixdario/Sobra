import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountSchema,
  categorySchema,
  paginated,
  type Transaction,
  transactionSchema,
} from '@financas/shared';
import type { App } from '../../app';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';

const pageSchema = paginated(transactionSchema);
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

describe('/transactions', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const call = (user: TestUser, method: Method, url: string, payload?: object) =>
    app.inject({ method, url, headers: authHeader(user), ...(payload && { payload }) });

  async function setup() {
    const user = await registerUser(app);
    const api = (method: Method, url: string, payload?: object) => call(user, method, url, payload);
    const categories = categorySchema.array().parse((await api('GET', '/categories')).json());
    const category = (name: string) => {
      const found = categories.find((c) => c.name === name);
      if (!found) throw new Error(`categoria ${name} ausente`);
      return found.id;
    };
    const createAccount = async (name: string, initialBalance = 0) => {
      const response = await api('POST', '/accounts', {
        name,
        type: 'checking',
        initialBalance,
        color: '#123456',
        icon: 'landmark',
      });
      return accountSchema.parse(response.json());
    };
    const create = async (payload: object) => {
      const response = await api('POST', '/transactions', payload);
      expect(response.statusCode, response.body).toBe(201);
      return transactionSchema.parse(response.json());
    };
    const list = async (query = '') => {
      const response = await api('GET', `/transactions${query}`);
      expect(response.statusCode, response.body).toBe(200);
      return pageSchema.parse(response.json());
    };
    return { user, api, category, createAccount, create, list };
  }

  it('cria, detalha, atualiza e exclui uma despesa', async () => {
    const { api, category, createAccount, create } = await setup();
    const account = await createAccount('Banco');

    const created = await create({
      type: 'expense',
      accountId: account.id,
      categoryId: category('Mercado'),
      amount: 4590,
      date: '2026-11-04',
      description: '  Supermercado  ',
      notes: 'semana',
    });
    expect(created).toMatchObject({
      type: 'expense',
      amount: 4590,
      description: 'Supermercado',
      notes: 'semana',
      categoryId: category('Mercado'),
    });

    const fetched = await api('GET', `/transactions/${created.id}`);
    expect(fetched.json()).toEqual(created);

    const patched = await api('PATCH', `/transactions/${created.id}`, {
      amount: 5000,
      notes: null,
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({
      amount: 5000,
      notes: null,
      description: 'Supermercado',
    });

    expect((await api('DELETE', `/transactions/${created.id}`)).statusCode).toBe(204);
    expect((await api('GET', `/transactions/${created.id}`)).statusCode).toBe(404);
  });

  it('embute conta, categoria e conta de destino para exibição', async () => {
    const { api, category, createAccount, create, list } = await setup();
    const checking = await createAccount('Corrente');
    const savings = await createAccount('Poupança');
    const expense = await create({
      type: 'expense',
      accountId: checking.id,
      categoryId: category('Mercado'),
      amount: 1_000,
      date: '2026-11-04',
      description: 'Feira',
    });
    expect(expense).toMatchObject({
      account: { id: checking.id, name: 'Corrente' },
      category: { id: category('Mercado'), name: 'Mercado', icon: expect.any(String) },
      toAccount: null,
    });
    expect(expense.category?.color).toMatch(/^#[0-9A-F]{6}$/);

    await create({
      type: 'transfer',
      accountId: checking.id,
      toAccountId: savings.id,
      amount: 500,
      date: '2026-11-05',
      description: 'Guardar',
    });
    const [transfer] = (await list('?type=transfer')).items;
    expect(transfer).toMatchObject({
      account: { id: checking.id, name: 'Corrente' },
      toAccount: { id: savings.id, name: 'Poupança' },
      category: null,
    });

    await api('PATCH', `/accounts/${savings.id}`, { name: 'Reserva' });
    const [renamed] = (await list('?type=transfer')).items;
    expect(renamed?.toAccount).toEqual({ id: savings.id, name: 'Reserva' });
  });

  it('transferência afeta o saldo das duas contas', async () => {
    const { api, createAccount, create } = await setup();
    const checking = await createAccount('Corrente', 100_000);
    const savings = await createAccount('Poupança');

    await create({
      type: 'transfer',
      accountId: checking.id,
      toAccountId: savings.id,
      amount: 30_000,
      date: '2026-11-04',
      description: 'Reserva',
    });

    const accounts = accountSchema.array().parse((await api('GET', '/accounts')).json());
    const balance = new Map(accounts.map((a) => [a.id, a.balance]));
    expect(balance.get(checking.id)).toBe(70_000);
    expect(balance.get(savings.id)).toBe(30_000);
  });

  it('recusa categoria de tipo errado, transferência para a mesma conta e conta arquivada', async () => {
    const { api, category, createAccount } = await setup();
    const account = await createAccount('Banco');
    const base = { accountId: account.id, amount: 100, date: '2026-11-04', description: 'x' };

    const wrongIncome = await api('POST', '/transactions', {
      ...base,
      type: 'income',
      categoryId: category('Mercado'),
    });
    expect(wrongIncome.statusCode).toBe(400);
    expect(errorOf(wrongIncome).message).toBe('Uma receita só pode usar categoria de receita');

    const wrongExpense = await api('POST', '/transactions', {
      ...base,
      type: 'expense',
      categoryId: category('Salário'),
    });
    expect(wrongExpense.statusCode).toBe(400);
    expect(errorOf(wrongExpense).message).toBe('Uma despesa só pode usar categoria de despesa');

    const sameAccount = await api('POST', '/transactions', {
      ...base,
      type: 'transfer',
      toAccountId: account.id,
    });
    expect(sameAccount.statusCode).toBe(400);

    await api('PATCH', `/accounts/${account.id}`, { archived: true });
    const archived = await api('POST', '/transactions', {
      ...base,
      type: 'expense',
      categoryId: category('Mercado'),
    });
    expect(archived.statusCode).toBe(400);
    expect(errorOf(archived).message).toBe('Conta arquivada não recebe novas transações');
  });

  it('PATCH mescla e revalida: troca de tipo exige o campo do novo tipo', async () => {
    const { api, category, createAccount, create } = await setup();
    const a = await createAccount('A');
    const b = await createAccount('B');
    const created = await create({
      type: 'expense',
      accountId: a.id,
      categoryId: category('Lazer'),
      amount: 100,
      date: '2026-11-04',
      description: 'x',
    });

    const missing = await api('PATCH', `/transactions/${created.id}`, { type: 'transfer' });
    expect(missing.statusCode).toBe(400);
    expect(errorOf(missing).details).toEqual([expect.objectContaining({ field: 'toAccountId' })]);

    const toTransfer = await api('PATCH', `/transactions/${created.id}`, {
      type: 'transfer',
      toAccountId: b.id,
    });
    expect(toTransfer.statusCode).toBe(200);
    expect(toTransfer.json()).toMatchObject({ type: 'transfer', toAccountId: b.id });
    expect(toTransfer.json()).not.toHaveProperty('categoryId');

    const wrongKind = await api('PATCH', `/transactions/${created.id}`, {
      type: 'income',
      categoryId: category('Lazer'),
    });
    expect(wrongKind.statusCode).toBe(400);
  });

  it('filtra por mês, conta (origem ou destino), categoria, tipo e busca', async () => {
    const { category, createAccount, create, list } = await setup();
    const a = await createAccount('A');
    const b = await createAccount('B');
    const mk = (extra: object) =>
      create({ amount: 1000, date: '2026-10-10', description: 'Item', ...extra });

    const market = await mk({
      type: 'expense',
      accountId: a.id,
      categoryId: category('Mercado'),
      description: 'Feira do Mês',
      notes: 'orgânicos',
    });
    const salary = await mk({
      type: 'income',
      accountId: a.id,
      categoryId: category('Salário'),
      date: '2026-11-05',
      description: 'Salário ACME',
    });
    const transfer = await mk({
      type: 'transfer',
      accountId: a.id,
      toAccountId: b.id,
      date: '2026-11-06',
      description: 'Reserva',
    });
    const onB = await mk({
      type: 'expense',
      accountId: b.id,
      categoryId: category('Lazer'),
      date: '2026-11-30',
      description: 'CAFÉ com amigos',
    });

    const ids = (page: { items: Transaction[] }) => page.items.map((t) => t.id).sort();

    expect(ids(await list('?month=2026-11'))).toEqual([salary.id, transfer.id, onB.id].sort());
    expect(ids(await list(`?accountId=${b.id}`))).toEqual([transfer.id, onB.id].sort());
    expect(ids(await list(`?categoryId=${category('Mercado')}`))).toEqual([market.id]);
    expect(ids(await list('?type=transfer'))).toEqual([transfer.id]);
    expect(ids(await list('?search=feira'))).toEqual([market.id]);
    expect(ids(await list('?search=ORGÂNICOS'))).toEqual([market.id]);
    expect(ids(await list('?search=café'))).toEqual([onB.id]);
    expect(ids(await list(`?month=2026-11&accountId=${a.id}&type=income`))).toEqual([salary.id]);
  });

  it('ordena e pagina com total', async () => {
    const { category, createAccount, create, list } = await setup();
    const account = await createAccount('A');
    for (const [day, amount] of [
      [1, 300],
      [2, 100],
      [3, 500],
      [4, 200],
      [5, 400],
    ] as const) {
      await create({
        type: 'expense',
        accountId: account.id,
        categoryId: category('Outros'),
        amount,
        date: `2026-09-0${day}`,
        description: `Compra ${day}`,
      });
    }

    const byDate = await list('?pageSize=2');
    expect(byDate).toMatchObject({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
    expect(byDate.items.map((t) => t.date)).toEqual(['2026-09-05', '2026-09-04']);

    const last = await list('?pageSize=2&page=3');
    expect(last.items.map((t) => t.date)).toEqual(['2026-09-01']);

    const byAmount = await list('?sort=amount:asc&pageSize=3');
    expect(byAmount.items.map((t) => t.amount)).toEqual([100, 200, 300]);

    const byDescription = await list('?sort=description:desc&pageSize=1');
    expect(byDescription.items[0]?.description).toBe('Compra 5');

    const beyond = await list('?page=10');
    expect(beyond).toMatchObject({ items: [], total: 5 });
  });

  it('valida a querystring', async () => {
    const { api } = await setup();
    const response = await api('GET', '/transactions?month=2026-13&sort=foo:asc&pageSize=500');
    expect(response.statusCode).toBe(400);
    const fields = (errorOf(response).details as { field: string }[]).map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['month', 'pageSize']));
  });

  it('exige autenticação', async () => {
    expect((await app.inject({ method: 'GET', url: '/transactions' })).statusCode).toBe(401);
  });

  describe('isolamento', () => {
    it('B não lê, edita nem apaga transação de A e não a vê na listagem', async () => {
      const alice = await setup();
      const bob = await setup();
      const account = await alice.createAccount('Conta da Alice');
      const tx = await alice.create({
        type: 'expense',
        accountId: account.id,
        categoryId: alice.category('Mercado'),
        amount: 100,
        date: '2026-11-04',
        description: 'Segredo',
      });

      for (const [method, payload] of [
        ['GET', undefined],
        ['PATCH', { amount: 1 }],
        ['DELETE', undefined],
      ] as const) {
        const response = await bob.api(method, `/transactions/${tx.id}`, payload);
        expect(response.statusCode).toBe(404);
        expect(errorOf(response).message).toBe('Transação não encontrada');
      }
      expect((await bob.list()).total).toBe(0);
      expect((await bob.list(`?accountId=${account.id}`)).total).toBe(0);
      expect((await alice.api('GET', `/transactions/${tx.id}`)).json()).toMatchObject({
        amount: 100,
      });
    });

    it('B não cria transação apontando para conta ou categoria de A (404)', async () => {
      const alice = await setup();
      const bob = await setup();
      const aliceAccount = await alice.createAccount('Conta da Alice');
      const bobAccount = await bob.createAccount('Conta do Bob');
      const base = { amount: 100, date: '2026-11-04', description: 'x' };

      const foreignAccount = await bob.api('POST', '/transactions', {
        ...base,
        type: 'expense',
        accountId: aliceAccount.id,
        categoryId: bob.category('Mercado'),
      });
      expect(foreignAccount.statusCode).toBe(404);
      expect(errorOf(foreignAccount).message).toBe('Conta não encontrada');

      const foreignCategory = await bob.api('POST', '/transactions', {
        ...base,
        type: 'expense',
        accountId: bobAccount.id,
        categoryId: alice.category('Mercado'),
      });
      expect(foreignCategory.statusCode).toBe(404);
      expect(errorOf(foreignCategory).message).toBe('Categoria não encontrada');

      const foreignTarget = await bob.api('POST', '/transactions', {
        ...base,
        type: 'transfer',
        accountId: bobAccount.id,
        toAccountId: aliceAccount.id,
      });
      expect(foreignTarget.statusCode).toBe(404);

      const own = await bob.create({
        ...base,
        type: 'expense',
        accountId: bobAccount.id,
        categoryId: bob.category('Mercado'),
      });
      const moved = await bob.api('PATCH', `/transactions/${own.id}`, {
        accountId: aliceAccount.id,
      });
      expect(moved.statusCode).toBe(404);
    });
  });
});
