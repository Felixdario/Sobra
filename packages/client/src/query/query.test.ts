import {
  InfiniteQueryObserver,
  MutationObserver,
  QueryClient,
  type QueryKey,
} from '@tanstack/query-core';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import type { Account, Transaction } from '@financas/shared';
import { createApiClient } from '../client';
import { ApiError } from '../errors';
import {
  account,
  BASE_URL,
  category,
  createFakeFetch,
  deferred,
  expense,
  type FakeHandler,
  type FakeReply,
  ids,
  page,
  tokens,
  user,
} from '../test/fakes';
import { createMemoryTokenStore } from '../tokenStore';
import type { TransactionPage } from '../types';
import {
  createMutations,
  createQueries,
  invalidationMap,
  isOptimisticId,
  queryKeys,
  shouldRetry,
  type ApiMutationOptions,
  type TransactionPages,
} from './index';

const clients: QueryClient[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

function setup(handler: FakeHandler) {
  const fake = createFakeFetch(handler);
  const api = createApiClient({
    baseUrl: BASE_URL,
    tokenStore: createMemoryTokenStore(tokens(1)),
    fetch: fake.fetch,
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(queryClient);
  return {
    api,
    queryClient,
    queries: createQueries(api),
    mutations: createMutations(api),
    ...fake,
  };
}

function run<TData, TVariables, TContext>(
  queryClient: QueryClient,
  options: ApiMutationOptions<TData, TVariables, TContext>,
  variables: TVariables,
) {
  return new MutationObserver(queryClient, options).mutate(variables);
}

const nubank = account(ids.nubank, 'Nubank', 100_000);
const poupanca = account(ids.poupanca, 'Poupança', 50_000);
const tx1 = expense(ids.tx1, '2026-11-04', 4590, 'Supermercado');
const tx2 = expense(ids.tx2, '2026-11-02', 1200, 'Padaria');
const novemberKey = queryKeys.transactions.list({ month: '2026-11' });
const octoberKey = queryKeys.transactions.list({ month: '2026-10' });

function seedCache(queryClient: QueryClient) {
  queryClient.setQueryData(queryKeys.accounts.list(), [nubank, poupanca]);
  queryClient.setQueryData(queryKeys.categories.list(), [category]);
  queryClient.setQueryData(novemberKey, page([tx1, tx2]));
  queryClient.setQueryData(octoberKey, page([]));
  queryClient.setQueryData(queryKeys.transactions.detail(ids.tx1), tx1);
}

function cacheState(queryClient: QueryClient) {
  return queryClient
    .getQueriesData({ queryKey: [] })
    .map(([key, data]) => [JSON.stringify(key), data] as const)
    .sort(([a], [b]) => a.localeCompare(b));
}

const balanceOf = (queryClient: QueryClient, id: string) =>
  queryClient.getQueryData<Account[]>(queryKeys.accounts.list())?.find((a) => a.id === id)?.balance;

describe('queryKeys', () => {
  it('são hierárquicas: domínio → tipo → parâmetros', () => {
    expect(queryKeys.transactions.list({ month: '2026-11' })).toEqual([
      'transactions',
      'list',
      { month: '2026-11' },
    ]);
    expect(queryKeys.transactions.detail(ids.tx1)).toEqual(['transactions', 'detail', ids.tx1]);
    expect(queryKeys.transactions.list().slice(0, 2)).toEqual(queryKeys.transactions.lists());
    expect(queryKeys.summary.month({ month: '2026-11' })[0]).toEqual(queryKeys.summary.all()[0]);
  });

  it('invalidar a raiz do domínio alcança listas e detalhes', async () => {
    const { queryClient } = setup(() => ({ status: 500 }));
    seedCache(queryClient);
    await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    for (const key of [novemberKey, octoberKey, queryKeys.transactions.detail(ids.tx1)]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(false);
  });
});

describe('createQueries', () => {
  it('queryOptions buscam pela API, repassam o signal e tipam o cache', async () => {
    const { queryClient, queries, requests } = setup(() => ({ status: 200, body: page([tx1]) }));
    const options = queries.transactions.list({ month: '2026-11', page: 1 });
    expect(options.queryKey).toEqual(['transactions', 'list', { month: '2026-11', page: 1 }]);

    const data = await queryClient.fetchQuery(options);
    expect(data.items[0]?.id).toBe(ids.tx1);
    expect(requests[0]?.query.get('month')).toBe('2026-11');
    expect(requests[0]?.signal).toBeDefined();

    expectTypeOf(data).toEqualTypeOf<TransactionPage>();
    expectTypeOf(queryClient.getQueryData(options.queryKey)).toEqualTypeOf<
      TransactionPage | undefined
    >();
  });

  it('shouldRetry: repete rede/5xx até 2 vezes, nunca 4xx', () => {
    const network = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' });
    const notFound = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' });
    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(2, network)).toBe(false);
    expect(shouldRetry(0, notFound)).toBe(false);
  });
});

describe('invalidações após mutação', () => {
  const allDomains = [
    'me',
    'accounts',
    'categories',
    'transactions',
    'budgets',
    'recurring',
    'imports',
    'summary',
  ] as const;

  function seedEveryDomain(queryClient: QueryClient) {
    const keys: Record<(typeof allDomains)[number], QueryKey> = {
      me: queryKeys.me(),
      accounts: queryKeys.accounts.list(),
      categories: queryKeys.categories.list(),
      transactions: queryKeys.transactions.list({ month: '2026-11' }),
      budgets: queryKeys.budgets.list('2026-11'),
      recurring: queryKeys.recurring.list(),
      imports: queryKeys.imports.list(),
      summary: queryKeys.summary.month({ month: '2026-11' }),
    };
    for (const [domain, key] of Object.entries(keys)) {
      queryClient.setQueryData(
        key,
        domain === 'transactions' ? page([]) : domain === 'me' ? user : [],
      );
    }
    return () =>
      allDomains.filter((domain) => queryClient.getQueryState(keys[domain])?.isInvalidated).sort();
  }

  it('criar transação invalida transactions, accounts (saldo), summary e budgets', async () => {
    const { queryClient, mutations } = setup(() => ({ status: 201, body: tx1 }));
    const invalidated = seedEveryDomain(queryClient);
    await run(queryClient, mutations.transactions.create, {
      type: 'expense',
      accountId: ids.nubank,
      categoryId: ids.mercado,
      amount: 4590,
      description: 'Supermercado',
      date: '2026-11-04',
    });
    expect(invalidated()).toEqual(['accounts', 'budgets', 'summary', 'transactions']);
  });

  it.each([
    ['budgets.upsert', ['budgets', 'summary']],
    ['categories.update', ['budgets', 'categories', 'summary', 'transactions']],
    ['recurring.remove', ['recurring']],
    ['imports.commit', ['accounts', 'budgets', 'imports', 'summary', 'transactions']],
  ] as const)('%s invalida %j', async (name, expected) => {
    const { queryClient, mutations } = setup((req) => ({
      status: req.method === 'DELETE' ? 204 : 200,
      body:
        req.method === 'DELETE'
          ? undefined
          : name === 'budgets.upsert'
            ? {
                id: ids.tx3,
                categoryId: ids.mercado,
                month: '2026-11',
                amount: 80000,
                spent: 0,
                remaining: 80000,
              }
            : name === 'categories.update'
              ? category
              : { batchId: ids.tx3, imported: 1, skipped: 0 },
    }));
    const invalidated = seedEveryDomain(queryClient);
    const variables = {
      'budgets.upsert': [
        mutations.budgets.upsert,
        { categoryId: ids.mercado, month: '2026-11', amount: 80000 },
      ],
      'categories.update': [
        mutations.categories.update,
        { id: ids.mercado, body: { name: 'Feira' } },
      ],
      'recurring.remove': [mutations.recurring.remove, ids.tx3],
      'imports.commit': [
        mutations.imports.commit,
        {
          accountId: ids.nubank,
          rows: [
            {
              date: '2026-11-04',
              description: 'X',
              type: 'expense',
              amount: 100,
              categoryId: ids.mercado,
            },
          ],
        },
      ],
    } as const;
    const [options, vars] = variables[name];
    await run(queryClient, options as ApiMutationOptions<unknown, unknown>, vars);
    expect(invalidated()).toEqual([...expected].sort());
    expect([...invalidationMap[name]].sort()).toEqual([...expected].sort());
  });

  it('login troca o cache pelo usuário novo; logout limpa tudo', async () => {
    const { queryClient, mutations } = setup((req) =>
      req.path === '/auth/login'
        ? { status: 200, body: { user, tokens: tokens(2) } }
        : { status: 204 },
    );
    seedCache(queryClient);
    await run(queryClient, mutations.auth.login, {
      email: 'demo@financas.dev',
      password: 'demo1234',
    });
    expect(queryClient.getQueryData(queryKeys.me())).toEqual(user);
    expect(queryClient.getQueryData(novemberKey)).toBeUndefined();

    await run(queryClient, mutations.auth.logout, undefined);
    expect(queryClient.getQueriesData({ queryKey: [] })).toHaveLength(0);
  });
});

const apiFailure: FakeReply = {
  status: 500,
  body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
};

describe('atualização otimista de transações', () => {
  /** The API answer stays pending until the test decides it. */
  function pendingApi() {
    const reply = deferred<FakeReply>();
    return { reply, handler: (() => reply.promise) satisfies FakeHandler };
  }

  it('criar: aparece na lista do mês certo e mexe no saldo antes da resposta; troca pelo item real', async () => {
    const { reply, handler } = pendingApi();
    const { queryClient, mutations } = setup(handler);
    seedCache(queryClient);

    const done = run(queryClient, mutations.transactions.create, {
      type: 'expense',
      accountId: ids.nubank,
      categoryId: ids.mercado,
      amount: 2500,
      description: '  Feira  ',
      date: '2026-11-03',
    });

    await expect.poll(() => queryClient.getQueryData<TransactionPage>(novemberKey)?.total).toBe(3);
    const items = queryClient.getQueryData<TransactionPage>(novemberKey)?.items ?? [];
    expect(items.map((t) => t.description)).toEqual(['Supermercado', 'Feira', 'Padaria']); // date desc
    const optimistic = items[1] as Transaction;
    expect(isOptimisticId(optimistic.id)).toBe(true);
    expect(optimistic).toMatchObject({
      account: { name: 'Nubank' },
      category: { name: 'Mercado' },
      notes: null,
    });
    expect(queryClient.getQueryData<TransactionPage>(octoberKey)?.total).toBe(0);
    expect(balanceOf(queryClient, ids.nubank)).toBe(97_500);

    const created = expense(ids.tx3, '2026-11-03', 2500, 'Feira');
    reply.resolve({ status: 201, body: created });
    await done;
    const after = queryClient.getQueryData<TransactionPage>(novemberKey)?.items ?? [];
    expect(after.map((t) => t.id)).toEqual([ids.tx1, ids.tx3, ids.tx2]);
  });

  it('criar com erro da API: rollback deixa o cache exatamente como antes', async () => {
    const { reply, handler } = pendingApi();
    const { queryClient, mutations } = setup(handler);
    seedCache(queryClient);
    const before = cacheState(queryClient);

    const done = run(queryClient, mutations.transactions.create, {
      type: 'transfer',
      accountId: ids.nubank,
      toAccountId: ids.poupanca,
      amount: 10_000,
      description: 'Reserva',
      date: '2026-11-05',
    });
    await expect.poll(() => balanceOf(queryClient, ids.poupanca)).toBe(60_000);
    expect(balanceOf(queryClient, ids.nubank)).toBe(90_000);

    reply.resolve(apiFailure);
    await expect(done).rejects.toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    expect(cacheState(queryClient)).toEqual(before);
  });

  it('editar: muda na lista, no detalhe e no saldo; sai da lista se deixar de bater no filtro; rollback', async () => {
    const { reply, handler } = pendingApi();
    const { queryClient, mutations } = setup(handler);
    seedCache(queryClient);
    const before = cacheState(queryClient);

    const done = run(queryClient, mutations.transactions.update, {
      id: ids.tx1,
      body: { amount: 5000, date: '2026-10-30' },
    });
    await expect.poll(() => queryClient.getQueryData<TransactionPage>(novemberKey)?.total).toBe(1);
    expect(queryClient.getQueryData<TransactionPage>(novemberKey)?.items.map((t) => t.id)).toEqual([
      ids.tx2,
    ]);
    expect(
      queryClient.getQueryData<Transaction>(queryKeys.transactions.detail(ids.tx1)),
    ).toMatchObject({ amount: 5000, date: '2026-10-30' });
    expect(balanceOf(queryClient, ids.nubank)).toBe(100_000 + 4590 - 5000);

    reply.resolve(apiFailure);
    await expect(done).rejects.toBeInstanceOf(ApiError);
    expect(cacheState(queryClient)).toEqual(before);
  });

  it('apagar (deslizar): some na hora, devolve o saldo; volta tudo se a API falhar', async () => {
    const { reply, handler } = pendingApi();
    const { queryClient, mutations } = setup(handler);
    seedCache(queryClient);
    const before = cacheState(queryClient);

    const done = run(queryClient, mutations.transactions.remove, ids.tx1);
    await expect.poll(() => queryClient.getQueryData<TransactionPage>(novemberKey)?.total).toBe(1);
    expect(queryClient.getQueryData(queryKeys.transactions.detail(ids.tx1))).toBeUndefined();
    expect(balanceOf(queryClient, ids.nubank)).toBe(104_590);

    reply.resolve(apiFailure);
    await expect(done).rejects.toBeInstanceOf(ApiError);
    expect(cacheState(queryClient)).toEqual(before);
  });

  it('apagar com sucesso mantém o item fora e invalida para reconciliar com o servidor', async () => {
    const { queryClient, mutations } = setup(() => ({ status: 204 }));
    seedCache(queryClient);
    await run(queryClient, mutations.transactions.remove, ids.tx1);
    expect(queryClient.getQueryData<TransactionPage>(novemberKey)?.items.map((t) => t.id)).toEqual([
      ids.tx2,
    ]);
    expect(queryClient.getQueryState(novemberKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(true);
  });
});

describe('lista infinita de transações', () => {
  const infiniteKey = queryKeys.transactions.infinite({ month: '2026-11' });
  const older = expense(ids.tx3, '2026-11-01', 900, 'Farmácia');
  const never = () => deferred<FakeReply>().promise;

  /** Two loaded pages of one item each (pageSize 1); a third on the server when `morePages`. */
  function seedPages(queryClient: QueryClient, morePages: boolean) {
    const total = morePages ? 3 : 2;
    const p = (n: number, items: Transaction[]): TransactionPage => ({
      items,
      page: n,
      pageSize: 1,
      total,
      totalPages: total,
    });
    queryClient.setQueryData(queryKeys.accounts.list(), [nubank, poupanca]);
    queryClient.setQueryData(queryKeys.categories.list(), [category]);
    queryClient.setQueryData<TransactionPages>(infiniteKey, {
      pages: [p(1, [tx1]), p(2, [tx2])],
      pageParams: [1, 2],
    });
  }
  const pages = (queryClient: QueryClient) =>
    queryClient.getQueryData<TransactionPages>(infiniteKey);
  const namesByPage = (queryClient: QueryClient) =>
    pages(queryClient)?.pages.map((p) => p.items.map((t) => t.description));
  const newExpense = (description: string, date: string, amount = 100) => ({
    type: 'expense' as const,
    accountId: ids.nubank,
    categoryId: ids.mercado,
    amount,
    description,
    date,
  });

  it('infiniteQueryOptions: chave sem página, página como pageParam, próxima enquanto houver', async () => {
    const replies = [
      { ...page([tx1], 1), total: 2, totalPages: 2 },
      { ...page([tx2], 1), page: 2, total: 2, totalPages: 2 },
    ];
    const { queryClient, queries, requests } = setup(() => ({
      status: 200,
      body: replies[requests.length - 1],
    }));
    const options = queries.transactions.infinite({ month: '2026-11' });
    expect(options.queryKey).toEqual(['transactions', 'infinite', { month: '2026-11' }]);
    expect(options.queryKey.slice(0, 2)).toEqual(queryKeys.transactions.infinites());

    const observer = new InfiniteQueryObserver(queryClient, options);
    await observer.refetch();
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
    await observer.fetchNextPage();
    expect(requests.map((r) => r.query.get('page'))).toEqual(['1', '2']);
    expect(requests[1]?.query.get('month')).toBe('2026-11');
    const result = observer.getCurrentResult();
    expect(result.hasNextPage).toBe(false);
    expect(result.data?.pages.flatMap((p) => p.items.map((t) => t.id))).toEqual([ids.tx1, ids.tx2]);
    expectTypeOf(queryClient.getQueryData(options.queryKey)).toEqualTypeOf<
      TransactionPages | undefined
    >();
  });

  it('criar insere na página certa pela data e atualiza o total de todas as páginas', async () => {
    const reply = deferred<FakeReply>();
    const { queryClient, mutations } = setup(() => reply.promise);
    seedPages(queryClient, false);

    const done = run(queryClient, mutations.transactions.create, newExpense('Café', '2026-11-02'));
    await expect.poll(() => pages(queryClient)?.pages[0]?.total).toBe(3);
    // Same day as "Padaria" (page 2): goes before it, on page 2.
    expect(namesByPage(queryClient)).toEqual([['Supermercado'], ['Café', 'Padaria']]);
    expect(pages(queryClient)?.pages.every((p) => p.totalPages === 3)).toBe(true);

    reply.resolve({ status: 201, body: expense(ids.tx3, '2026-11-02', 100, 'Café') });
    await done;
    expect(pages(queryClient)?.pages[1]?.items[0]?.id).toBe(ids.tx3);
  });

  it('criar mais antigo que tudo: fim da última página se acabou; fora da vista se há página por vir', async () => {
    const ended = setup(never);
    seedPages(ended.queryClient, false);
    void run(
      ended.queryClient,
      ended.mutations.transactions.create,
      newExpense('Antigo', '2026-11-01'),
    );
    await expect.poll(() => namesByPage(ended.queryClient)?.[1]).toEqual(['Padaria', 'Antigo']);

    const more = setup(never);
    seedPages(more.queryClient, true);
    void run(
      more.queryClient,
      more.mutations.transactions.create,
      newExpense('Antigo', '2026-11-01'),
    );
    await expect.poll(() => pages(more.queryClient)?.pages[0]?.total).toBe(4);
    expect(namesByPage(more.queryClient)).toEqual([['Supermercado'], ['Padaria']]);
  });

  it('criar fora do filtro não toca nas páginas; o saldo muda igual', async () => {
    const { queryClient, mutations } = setup(never);
    seedPages(queryClient, false);
    const before = pages(queryClient);
    void run(queryClient, mutations.transactions.create, newExpense('Outubro', '2026-10-10'));
    await expect.poll(() => balanceOf(queryClient, ids.nubank)).toBe(99_900);
    expect(pages(queryClient)).toBe(before);
  });

  it('editar espelha nas páginas e muda de lugar se a data mudar; saldo usa o item das páginas; rollback', async () => {
    const reply = deferred<FakeReply>();
    const { queryClient, mutations } = setup(() => reply.promise);
    seedPages(queryClient, false);
    const before = cacheState(queryClient);

    const done = run(queryClient, mutations.transactions.update, {
      id: ids.tx1,
      body: { amount: 5000, date: '2026-11-01', description: 'Mercado do mês' },
    });
    await expect.poll(() => namesByPage(queryClient)).toEqual([[], ['Padaria', 'Mercado do mês']]);
    expect(pages(queryClient)?.pages[0]?.total).toBe(2);
    expect(balanceOf(queryClient, ids.nubank)).toBe(100_000 + 4590 - 5000);

    reply.resolve(apiFailure);
    await expect(done).rejects.toBeInstanceOf(ApiError);
    expect(cacheState(queryClient)).toEqual(before);
  });

  it('editar sem mudar a data troca no lugar; sair do filtro remove das páginas', async () => {
    const { queryClient, mutations } = setup(never);
    seedPages(queryClient, false);
    void run(queryClient, mutations.transactions.update, {
      id: ids.tx2,
      body: { description: 'Padaria da esquina' },
    });
    await expect
      .poll(() => namesByPage(queryClient))
      .toEqual([['Supermercado'], ['Padaria da esquina']]);

    void run(queryClient, mutations.transactions.update, {
      id: ids.tx1,
      body: { date: '2026-10-31' },
    });
    await expect.poll(() => namesByPage(queryClient)).toEqual([[], ['Padaria da esquina']]);
    expect(pages(queryClient)?.pages.map((p) => p.total)).toEqual([1, 1]);
  });

  it('apagar some das páginas, devolve o saldo e volta tudo se a API falhar', async () => {
    const reply = deferred<FakeReply>();
    const { queryClient, mutations } = setup(() => reply.promise);
    seedPages(queryClient, false);
    const singleKey = queryKeys.transactions.list({ month: '2026-11' });
    queryClient.setQueryData(singleKey, page([tx1, older]));
    const before = cacheState(queryClient);

    const done = run(queryClient, mutations.transactions.remove, ids.tx2);
    await expect.poll(() => namesByPage(queryClient)).toEqual([['Supermercado'], []]);
    expect(pages(queryClient)?.pages.map((p) => p.total)).toEqual([1, 1]);
    expect(balanceOf(queryClient, ids.nubank)).toBe(101_200);
    // A single-page list without the item is left alone.
    expect(queryClient.getQueryData<TransactionPage>(singleKey)?.total).toBe(2);

    reply.resolve(apiFailure);
    await expect(done).rejects.toBeInstanceOf(ApiError);
    expect(cacheState(queryClient)).toEqual(before);
  });

  it('as mutações invalidam as páginas para reconciliar com o servidor', async () => {
    const { queryClient, mutations } = setup(() => ({ status: 204 }));
    seedPages(queryClient, false);
    await run(queryClient, mutations.transactions.remove, ids.tx1);
    expect(queryClient.getQueryState(infiniteKey)?.isInvalidated).toBe(true);
  });
});
