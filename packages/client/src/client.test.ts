import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { z } from 'zod';
import type { paginated, Transaction, transactionSchema } from '@sobra/shared';
import { createApiClient, type ApiClientConfig } from './client';
import { ApiError, CLIENT_ERROR_MESSAGES } from './errors';
import { createMemoryTokenStore } from './tokenStore';
import {
  account,
  BASE_URL,
  createFakeFetch,
  deferred,
  expense,
  type FakeHandler,
  ids,
  page,
  tokens,
  user,
} from './test/fakes';

function setup(handler: FakeHandler, options: { timeoutMs?: number; loggedIn?: boolean } = {}) {
  const tokenStore = createMemoryTokenStore(options.loggedIn === false ? null : tokens(1));
  const onSessionExpired = vi.fn();
  const fake = createFakeFetch(handler);
  const client = createApiClient({
    baseUrl: `${BASE_URL}/`,
    tokenStore,
    fetch: fake.fetch,
    onSessionExpired,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  return { client, tokenStore, onSessionExpired, ...fake };
}

const unauthorized = {
  status: 401,
  body: {
    error: { code: 'UNAUTHORIZED', message: 'Token de acesso ausente, inválido ou expirado' },
  },
};

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('era esperado um erro');
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('autenticação', () => {
  it('injeta o Bearer do tokenStore nas rotas protegidas', async () => {
    const { client, requests } = setup(() => ({ status: 200, body: user }));
    await expect(client.auth.me()).resolves.toEqual(user);
    expect(requests[0]?.headers.authorization).toBe('Bearer access-1');
    expect(requests[0]?.path).toBe('/me');
  });

  it('updatePreferences faz PATCH /me/preferences e devolve o usuário validado', async () => {
    const updated = { ...user, locale: 'en-US', currency: 'USD' };
    const { client, requests } = setup(() => ({ status: 200, body: updated }));
    await expect(
      client.auth.updatePreferences({ locale: 'en-US', currency: 'USD' }),
    ).resolves.toEqual(updated);
    expect(requests[0]).toMatchObject({
      method: 'PATCH',
      path: '/me/preferences',
      body: { locale: 'en-US', currency: 'USD' },
    });
  });

  it('login guarda os tokens, devolve o usuário e não manda Bearer', async () => {
    const { client, tokenStore, requests } = setup(
      () => ({ status: 200, body: { user, tokens: tokens(7) } }),
      { loggedIn: false },
    );
    await expect(
      client.auth.login({ email: 'demo@sobra.dev', password: 'demo1234' }),
    ).resolves.toEqual(user);
    expect(await tokenStore.get()).toEqual(tokens(7));
    expect(requests[0]?.headers.authorization).toBeUndefined();
    expect(requests[0]?.body).toEqual({ email: 'demo@sobra.dev', password: 'demo1234' });
  });

  it('senha errada é ApiError 401 sem tentar refresh', async () => {
    const { client, count, onSessionExpired } = setup(() => ({
      status: 401,
      body: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos' } },
    }));
    const error = await rejection(client.auth.login({ email: 'a@b.com', password: 'x' }));
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos',
    });
    expect(count('POST', '/auth/refresh')).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('logout encerra a sessão na API e limpa o store, mesmo se a API falhar', async () => {
    const ok = setup(() => ({ status: 204 }));
    await ok.client.auth.logout();
    expect(ok.requests[0]).toMatchObject({
      method: 'POST',
      path: '/auth/logout',
      body: { refreshToken: 'refresh-1' },
    });
    expect(await ok.tokenStore.get()).toBeNull();

    const offline = setup(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(offline.client.auth.logout()).resolves.toBeUndefined();
    expect(await offline.tokenStore.get()).toBeNull();
    expect(offline.onSessionExpired).not.toHaveBeenCalled();
  });
});

describe('refresh em 401', () => {
  it('3 requisições concorrentes com 401 fazem 1 único POST /auth/refresh e são repetidas', async () => {
    const refreshReply = deferred<void>();
    const { client, tokenStore, requests, count, onSessionExpired } = setup(async (req) => {
      if (req.path === '/auth/refresh') {
        await refreshReply.promise; // keeps the refresh in flight while the 401s pile up
        return { status: 200, body: tokens(2) };
      }
      if (req.headers.authorization !== 'Bearer access-2') return unauthorized;
      if (req.path === '/me') return { status: 200, body: user };
      if (req.path === '/accounts')
        return { status: 200, body: [account(ids.nubank, 'Nubank', 1000)] };
      return { status: 200, body: page([expense(ids.tx1, '2026-11-04', 4590)]) };
    });

    const all = Promise.all([client.auth.me(), client.accounts.list(), client.transactions.list()]);
    await vi.waitFor(() => expect(count('POST', '/auth/refresh')).toBe(1));
    await vi.waitFor(() =>
      expect(requests.filter((r) => r.headers.authorization === 'Bearer access-1')).toHaveLength(3),
    );
    refreshReply.resolve();
    const [me, accounts, transactions] = await all;

    expect(me).toEqual(user);
    expect(accounts).toHaveLength(1);
    expect(transactions.items).toHaveLength(1);
    expect(count('POST', '/auth/refresh')).toBe(1);
    expect(requests.find((r) => r.path === '/auth/refresh')?.body).toEqual({
      refreshToken: 'refresh-1',
    });
    expect(requests.filter((r) => r.headers.authorization === 'Bearer access-2')).toHaveLength(3);
    expect(await tokenStore.get()).toEqual(tokens(2));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('um 401 que chega depois do refresh só repete com o token novo, sem novo refresh', async () => {
    const slowMe = deferred<void>();
    const { client, count } = setup(async (req) => {
      if (req.path === '/auth/refresh') return { status: 200, body: tokens(2) };
      if (req.headers.authorization !== 'Bearer access-2') {
        if (req.path === '/me') await slowMe.promise;
        return unauthorized;
      }
      return req.path === '/me' ? { status: 200, body: user } : { status: 200, body: [] };
    });

    const me = client.auth.me();
    await client.accounts.list(); // 401 → refresh → retry, while /me is still waiting
    slowMe.resolve();
    await expect(me).resolves.toEqual(user);
    expect(count('POST', '/auth/refresh')).toBe(1);
  });

  it('refresh recusado: limpa o store, chama onSessionExpired uma vez e rejeita todas', async () => {
    const { client, tokenStore, count, onSessionExpired } = setup((req) =>
      req.path === '/auth/refresh'
        ? { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } } }
        : unauthorized,
    );

    const results = await Promise.allSettled([
      client.auth.me(),
      client.accounts.list(),
      client.categories.list(),
    ]);

    expect(count('POST', '/auth/refresh')).toBe(1);
    expect(await tokenStore.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      expect((result as PromiseRejectedResult).reason).toMatchObject({
        status: 401,
        code: 'SESSION_EXPIRED',
        message: CLIENT_ERROR_MESSAGES.sessionExpired,
      });
    }
  });

  it('refresh sem rede mantém a sessão (o refresh token pode valer) e propaga NETWORK_ERROR', async () => {
    const { client, tokenStore, onSessionExpired } = setup((req) => {
      if (req.path === '/auth/refresh') throw new TypeError('Network request failed');
      return unauthorized;
    });
    const error = await rejection(client.auth.me());
    expect(error.code).toBe('NETWORK_ERROR');
    expect(await tokenStore.get()).toEqual(tokens(1));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('store só com refresh token (web recarregada) renova antes, uma vez, sem gastar 401', async () => {
    const { client, tokenStore, requests, count } = setup((req) => {
      if (req.path === '/auth/refresh') return { status: 200, body: tokens(2) };
      return req.headers.authorization === 'Bearer access-2'
        ? { status: 200, body: req.path === '/me' ? user : [] }
        : unauthorized;
    });
    await tokenStore.set({ ...tokens(1), accessToken: '' });

    await Promise.all([client.auth.me(), client.accounts.list(), client.categories.list()]);

    expect(count('POST', '/auth/refresh')).toBe(1);
    expect(
      requests.filter((r) => r.path !== '/auth/refresh').map((r) => r.headers.authorization),
    ).toEqual(['Bearer access-2', 'Bearer access-2', 'Bearer access-2']);
  });

  it('sem sessão, um 401 não tenta refresh nem chama onSessionExpired', async () => {
    const { client, count, onSessionExpired } = setup(() => unauthorized, { loggedIn: false });
    const error = await rejection(client.auth.me());
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(count('POST', '/auth/refresh')).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('refreshLock: duas abas com o refresh token em comum nunca trocam o mesmo token', async () => {
    // API double with rotation and reuse detection, like ADR-012.
    let valid = 'refresh-1';
    let issued = 1;
    const reused: string[] = [];
    const fake = createFakeFetch(async (req) => {
      if (req.path === '/auth/refresh') {
        const { refreshToken } = req.body as { refreshToken: string };
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (refreshToken !== valid) {
          reused.push(refreshToken);
          return unauthorized;
        }
        issued += 1;
        valid = `refresh-${issued}`;
        return { status: 200, body: tokens(issued) };
      }
      const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
      return token !== 'access-0' && token.startsWith('access-')
        ? { status: 200, body: user }
        : unauthorized;
    });

    // localStorage (refresh) is shared; each tab keeps its access token in memory.
    let sharedRefresh = 'refresh-1';
    let queue = Promise.resolve();
    const lock: NonNullable<ApiClientConfig['refreshLock']> = (run) => {
      const result = queue.then(run);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    };
    const tab = () => {
      let access = 'access-0'; // expired
      return createApiClient({
        baseUrl: BASE_URL,
        fetch: fake.fetch,
        refreshLock: lock,
        tokenStore: {
          get: async () => ({ accessToken: access, refreshToken: sharedRefresh, expiresIn: 900 }),
          set: async (pair) => {
            access = pair.accessToken;
            sharedRefresh = pair.refreshToken;
          },
          clear: async () => undefined,
        },
      });
    };

    const [a, b] = [tab(), tab()];
    await Promise.all([a.auth.me(), b.auth.me()]);
    expect(reused).toEqual([]);
    expect(fake.requests.filter((r) => r.path === '/auth/refresh').map((r) => r.body)).toEqual([
      { refreshToken: 'refresh-1' },
      { refreshToken: 'refresh-2' },
    ]);
  });
});

describe('respostas e erros', () => {
  it('resposta fora do contrato vira INVALID_RESPONSE com os issues do Zod', async () => {
    const { client } = setup(() => ({ status: 200, body: { ...user, email: 'não-é-email' } }));
    const error = await rejection(client.auth.me());
    expect(error).toMatchObject({
      status: 200,
      code: 'INVALID_RESPONSE',
      message: CLIENT_ERROR_MESSAGES.invalidResponse,
    });
    expect(error.details).toEqual([expect.objectContaining({ path: ['email'] })]);
  });

  it('corpo que não é JSON também é INVALID_RESPONSE', async () => {
    const { client } = setup(() => ({ status: 200, body: '<html>proxy</html>' }));
    expect((await rejection(client.auth.me())).code).toBe('INVALID_RESPONSE');
  });

  it('erro da API mantém code, message pt-BR e details', async () => {
    const details = [{ field: 'amount', in: 'body', message: 'O valor deve ser maior que zero' }];
    const { client } = setup(() => ({
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details } },
    }));
    const error = await rejection(
      client.transactions.create({
        type: 'expense',
        accountId: ids.nubank,
        categoryId: ids.mercado,
        amount: 0,
        description: 'x',
        date: '2026-11-04',
      }),
    );
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details,
    });
    expect(error.isRetryable).toBe(false);
  });

  it('erro sem o formato da API vira HTTP_ERROR com mensagem pt-BR pelo status', async () => {
    const { client } = setup(() => ({ status: 502, body: 'Bad Gateway' }));
    const error = await rejection(client.auth.me());
    expect(error).toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Erro no servidor. Tente de novo mais tarde.',
    });
    expect(error.isRetryable).toBe(true);
  });

  it('falha de rede vira NETWORK_ERROR com mensagem pt-BR', async () => {
    const { client } = setup(() => {
      throw new TypeError('fetch failed');
    });
    const error = await rejection(client.accounts.list());
    expect(error).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.',
    });
    expect(error.cause).toBeInstanceOf(TypeError);
    expect(error.isRetryable).toBe(true);
  });

  const hangUntilAborted: FakeHandler = (req) =>
    new Promise((_resolve, reject) => {
      req.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
    });

  it('timeout configurável vira TIMEOUT', async () => {
    const { client } = setup(hangUntilAborted, { timeoutMs: 20 });
    const error = await rejection(client.accounts.list());
    expect(error).toMatchObject({
      status: 0,
      code: 'TIMEOUT',
      message: CLIENT_ERROR_MESSAGES.timeout,
    });
  });

  it('cancelamento pelo signal (TanStack) vira ABORTED', async () => {
    const { client } = setup(hangUntilAborted);
    const controller = new AbortController();
    const pending = client.accounts.list({}, { signal: controller.signal });
    controller.abort();
    expect((await rejection(pending)).code).toBe('ABORTED');
  });
});

describe('rotas', () => {
  it('monta a query string sem valores vazios e sem barra dupla', async () => {
    const { client, requests } = setup(() => ({ status: 200, body: page([]) }));
    await client.transactions.list({
      month: '2026-11',
      search: 'pão & café',
      type: undefined,
      accountId: '',
      sort: 'amount:asc',
      page: 2,
    });
    const [request] = requests;
    expect(request?.path).toBe('/transactions');
    expect(Object.fromEntries(request?.query ?? [])).toEqual({
      month: '2026-11',
      search: 'pão & café',
      sort: 'amount:asc',
      page: '2',
    });
  });

  it('accounts.remove distingue exclusão (204) de arquivamento (200)', async () => {
    const archived = { ...account(ids.nubank, 'Nubank', 0), archived: true };
    const { client } = setup((req) =>
      req.path.endsWith(ids.nubank) ? { status: 200, body: archived } : { status: 204 },
    );
    await expect(client.accounts.remove(ids.nubank)).resolves.toEqual({
      status: 'archived',
      account: archived,
    });
    await expect(client.accounts.remove(ids.poupanca)).resolves.toEqual({ status: 'deleted' });
  });

  it.each([
    [
      'budgets.list',
      (c: ReturnType<typeof setup>['client']) => c.budgets.list('2026-11'),
      'GET',
      '/budgets?month=2026-11',
    ],
    [
      'budgets.copy',
      (c: ReturnType<typeof setup>['client']) => c.budgets.copy({ from: '2026-10', to: '2026-11' }),
      'POST',
      '/budgets/copy',
    ],
    [
      'recurring.sync',
      (c: ReturnType<typeof setup>['client']) => c.recurring.sync(),
      'POST',
      '/recurring/sync',
    ],
    [
      'imports.undo',
      (c: ReturnType<typeof setup>['client']) => c.imports.undo(ids.tx1),
      'DELETE',
      `/imports/${ids.tx1}`,
    ],
    [
      'summary.balanceHistory',
      (c: ReturnType<typeof setup>['client']) =>
        c.summary.balanceHistory({ from: '2026-06', to: '2026-11', granularity: 'day' }),
      'GET',
      '/summary/balance-history?from=2026-06&to=2026-11&granularity=day',
    ],
  ] as const)('%s chama %s %s', async (_name, call, method, url) => {
    const { client, requests } = setup(() => ({ status: 500 }));
    await call(client).catch(() => undefined);
    const [request] = requests;
    const query = request?.query.toString();
    expect(`${request?.method} ${request?.path}${query ? `?${query}` : ''}`).toBe(
      `${method} ${url}`,
    );
  });
});

describe('tipos', () => {
  it('transactions.list devolve o tipo de paginated(transactionSchema), sem any', () => {
    type Client = ReturnType<typeof createApiClient>;
    type Page = z.output<ReturnType<typeof paginated<typeof transactionSchema>>>;
    expectTypeOf<Awaited<ReturnType<Client['transactions']['list']>>>().toEqualTypeOf<Page>();
    expectTypeOf<
      Awaited<ReturnType<Client['transactions']['list']>>['items'][number]
    >().toEqualTypeOf<Transaction>();
    expectTypeOf<Awaited<ReturnType<Client['transactions']['list']>>>().not.toBeAny();
  });

  it('aceita o fetch da plataforma sem adaptador', () => {
    const platformFetch: NonNullable<ApiClientConfig['fetch']> = globalThis.fetch;
    expect(platformFetch).toBeTypeOf('function');
  });
});
