import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createApiClient,
  createMemoryTokenStore,
  type FetchLike,
  type TokenStore,
} from '@sobra/client';
import type { App } from './app';
import { createTestApp, registerUser, type TestUser } from './test/helpers';

/**
 * `@sobra/client` against the real API (HTTP on 127.0.0.1, private SQLite): the contract
 * the client validates is the one the API serves, and the single-flight refresh survives the
 * API's refresh-token reuse detection.
 */
describe('@sobra/client contra a API real', () => {
  let app: App;
  let baseUrl: string;
  let registered: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen({ host: '127.0.0.1', port: 0 });
    baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    registered = await registerUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function connect(tokenStore: TokenStore = createMemoryTokenStore()) {
    const onSessionExpired = vi.fn();
    return {
      client: createApiClient({ baseUrl, tokenStore, onSessionExpired }),
      tokenStore,
      onSessionExpired,
    };
  }

  it('faz login com o usuário registrado, lança e lista transações', async () => {
    const { client } = connect();
    const user = await client.auth.login({
      email: registered.user.email,
      password: registered.password,
    });
    expect(user.id).toBe(registered.user.id);
    await expect(client.auth.me()).resolves.toEqual(registered.user);

    const [carteira] = await client.accounts.list();
    const mercado = (await client.categories.list({ kind: 'expense' })).find(
      (c) => c.name === 'Mercado',
    );
    expect(carteira?.name).toBe('Carteira');
    expect(mercado).toBeDefined();

    const created = await client.transactions.create({
      type: 'expense',
      accountId: carteira?.id ?? '',
      categoryId: mercado?.id ?? '',
      amount: 4590,
      description: 'Supermercado',
      date: '2026-11-04',
    });

    const page = await client.transactions.list({ month: '2026-11', sort: 'date:desc' });
    expect(page).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    expect(page.items[0]).toEqual(created);
    expect(page.items[0]).toMatchObject({
      account: { name: 'Carteira' },
      category: { name: 'Mercado' },
    });

    const [account] = await client.accounts.list();
    expect(account?.balance).toBe(-4590);
  });

  it('3 requisições concorrentes com access token inválido renovam uma vez e seguem válidas', async () => {
    const { client, tokenStore, onSessionExpired } = connect();
    await client.auth.login({ email: registered.user.email, password: registered.password });
    const original = await tokenStore.get();
    if (!original) throw new Error('login não guardou os tokens');
    await tokenStore.set({ ...original, accessToken: 'expirado' });

    const [me, accounts, transactions] = await Promise.all([
      client.auth.me(),
      client.accounts.list(),
      client.transactions.list(),
    ]);
    expect(me.id).toBe(registered.user.id);
    expect(accounts.length).toBeGreaterThan(0);
    expect(transactions.total).toBeGreaterThanOrEqual(0);

    const renewed = await tokenStore.get();
    expect(renewed?.refreshToken).not.toBe(original.refreshToken);
    // A second refresh with the old token would have revoked the family: the session still works.
    await tokenStore.set({ ...(renewed ?? original), accessToken: 'expirado-de-novo' });
    await expect(client.auth.me()).resolves.toMatchObject({ id: registered.user.id });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('refresh token revogado: limpa a sessão e avisa onSessionExpired', async () => {
    const { client, tokenStore, onSessionExpired } = connect();
    await client.auth.login({ email: registered.user.email, password: registered.password });
    const tokens = await tokenStore.get();
    if (!tokens) throw new Error('login não guardou os tokens');
    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken: tokens.refreshToken },
    });
    await tokenStore.set({ ...tokens, accessToken: 'expirado' });

    await expect(client.accounts.list()).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED',
    });
    expect(await tokenStore.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('erros da API chegam tipados, com mensagem pt-BR', async () => {
    const { client } = connect();
    await expect(
      client.auth.login({ email: registered.user.email, password: 'senha-errada' }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  describe("session: 'cookie' (web)", () => {
    /**
     * What the browser does and Node's fetch does not: keep the cookies the API sets (honoring
     * Max-Age=0 on logout) and send them back. Paths are ignored; only /auth reads them anyway.
     */
    function browserJar() {
      const cookies = new Map<string, string>();
      const fetchWithJar = async (url: string, init: RequestInit) => {
        const headers = new Headers(init.headers);
        if (cookies.size > 0) {
          headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
        }
        const response = await fetch(url, { ...init, headers });
        for (const line of response.headers.getSetCookie()) {
          const [pair = ''] = line.split(';');
          const [name = '', value = ''] = pair.split('=');
          if (/max-age=0|expires=thu, 01 jan 1970/i.test(line)) cookies.delete(name);
          else cookies.set(name, value);
        }
        return response;
      };
      return { cookies, fetch: fetchWithJar as unknown as FetchLike };
    }

    const webClient = (jar: ReturnType<typeof browserJar>, onSessionExpired = vi.fn()) =>
      createApiClient({
        baseUrl,
        session: 'cookie',
        fetch: jar.fetch,
        getCsrfToken: () => jar.cookies.get('sobra_csrf') ?? null,
        onSessionExpired,
      });

    it('login, recarregar (cliente novo, mesmo cookie), renovar e sair', async () => {
      const jar = browserJar();
      await webClient(jar).auth.login({
        email: registered.user.email,
        password: registered.password,
      });
      expect([...jar.cookies.keys()].sort()).toEqual(['sobra_csrf', 'sobra_refresh']);
      const firstRefresh = jar.cookies.get('sobra_refresh');

      const reloaded = webClient(jar);
      await expect(reloaded.auth.me()).resolves.toMatchObject({ id: registered.user.id });
      expect(jar.cookies.get('sobra_refresh')).not.toBe(firstRefresh);

      await reloaded.auth.logout();
      expect(jar.cookies.size).toBe(0);

      // Logged out: no cookies, nothing to renew. A plain 401, not a "session expired".
      const onSessionExpired = vi.fn();
      await expect(webClient(jar, onSessionExpired).auth.me()).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
      });
      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('cookie de refresh revogado no servidor: limpa a sessão e avisa onSessionExpired', async () => {
      const jar = browserJar();
      await webClient(jar).auth.login({
        email: registered.user.email,
        password: registered.password,
      });
      await app.prisma.refreshToken.updateMany({
        where: { userId: registered.user.id },
        data: { revokedAt: new Date() },
      });

      const onSessionExpired = vi.fn();
      await expect(webClient(jar, onSessionExpired).auth.me()).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
      });
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });
  });
});
