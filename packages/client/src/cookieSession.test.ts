import { describe, expect, it, vi } from 'vitest';
import type { CookieTokens } from '@sobra/shared';
import { createApiClient, type ApiClientConfig } from './client';
import { ApiError } from './errors';
import { createMemoryTokenStore } from './tokenStore';
import { BASE_URL, createFakeFetch, type FakeRequest, tokens, user } from './test/fakes';

/**
 * `session: 'cookie'` (web, ADR-034) against an API double that behaves like the real one: the
 * refresh token lives in a cookie jar the client never sees, rotates on every refresh (reuse of an
 * old one is refused) and is only accepted with `X-CSRF-Token` equal to the CSRF cookie.
 */
function cookieApi() {
  let issued = 1;
  const jar = { refresh: 'refresh-1' as string | null, csrf: 'csrf-1' as string | null };
  const presented: (string | null)[] = [];
  const unauthorized = (message = 'Token de acesso ausente, inválido ou expirado') => ({
    status: 401,
    body: { error: { code: 'UNAUTHORIZED', message } },
  });

  const fake = createFakeFetch(async (req: FakeRequest) => {
    if (req.path === '/auth/login') {
      jar.refresh = `refresh-${issued}`;
      jar.csrf = `csrf-${issued}`;
      return { status: 200, body: { user, tokens: tokens(issued) } };
    }
    if (req.path === '/auth/refresh' || req.path === '/auth/logout') {
      presented.push(jar.refresh);
      if (jar.refresh && req.headers['x-csrf-token'] !== jar.csrf) {
        return { status: 403, body: { error: { code: 'FORBIDDEN', message: 'CSRF inválido' } } };
      }
      if (req.path === '/auth/logout') {
        jar.refresh = null;
        jar.csrf = null;
        return { status: 204 };
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (jar.refresh !== `refresh-${issued}`) return unauthorized('Sessão expirada');
      issued += 1;
      jar.refresh = `refresh-${issued}`;
      jar.csrf = `csrf-${issued}`;
      const { accessToken, expiresIn } = tokens(issued);
      return { status: 200, body: { accessToken, expiresIn } };
    }
    return req.headers.authorization === `Bearer access-${issued}`
      ? { status: 200, body: req.path === '/me' ? user : [] }
      : unauthorized();
  });
  return { ...fake, jar, presented, getCsrfToken: () => jar.csrf };
}

type SetupOptions = Pick<ApiClientConfig, 'fetch'> & { getCsrfToken?: () => string | null };

function setup(initial: CookieTokens | null = null, options: SetupOptions = {}) {
  const api = cookieApi();
  const tokenStore = createMemoryTokenStore<CookieTokens>(initial);
  const onSessionExpired = vi.fn();
  const client = createApiClient({
    baseUrl: BASE_URL,
    session: 'cookie',
    tokenStore,
    getCsrfToken: options.getCsrfToken ?? api.getCsrfToken,
    fetch: options.fetch ?? api.fetch,
    onSessionExpired,
  });
  return { client, tokenStore, onSessionExpired, ...api };
}

describe("session: 'cookie' (web)", () => {
  it('toda requisição vai com credentials include, X-Sobra-Client e o CSRF do provedor', async () => {
    const { client, requests } = setup({ accessToken: 'access-1', expiresIn: 900 });
    await client.auth.me();
    expect(requests[0]).toMatchObject({
      credentials: 'include',
      headers: { 'x-sobra-client': 'web', 'x-csrf-token': 'csrf-1' },
    });
  });

  it('login guarda só o access token, mesmo se a API mandar o refresh no corpo', async () => {
    const { client, tokenStore } = setup();
    await expect(
      client.auth.login({ email: 'demo@sobra.dev', password: 'demo1234' }),
    ).resolves.toEqual(user);
    expect(await tokenStore.get()).toEqual({ accessToken: 'access-1', expiresIn: 900 });
  });

  it('página recarregada (store vazio): 3 chamadas fazem 1 refresh pelo cookie, sem corpo', async () => {
    const { client, requests, count, tokenStore, onSessionExpired } = setup();

    await Promise.all([client.auth.me(), client.accounts.list(), client.categories.list()]);

    expect(count('POST', '/auth/refresh')).toBe(1);
    const refresh = requests.find((r) => r.path === '/auth/refresh');
    expect(refresh?.body).toBeUndefined();
    expect(refresh?.headers).toMatchObject({ 'x-csrf-token': 'csrf-1', 'x-sobra-client': 'web' });
    expect(refresh?.headers.authorization).toBeUndefined();
    expect(
      requests.filter((r) => r.path !== '/auth/refresh').map((r) => r.headers.authorization),
    ).toEqual(['Bearer access-2', 'Bearer access-2', 'Bearer access-2']);
    expect(await tokenStore.get()).toEqual({ accessToken: 'access-2', expiresIn: 900 });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('sem cookie de CSRF (nunca entrou ou saiu): 401 comum, sem refresh nem "sessão expirada"', async () => {
    const { client, jar, count, onSessionExpired } = setup();
    jar.csrf = null;
    jar.refresh = null;

    const error = await client.auth.me().catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(count('POST', '/auth/refresh')).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('depois do logout, chamadas que ainda saírem não tentam refresh', async () => {
    const { client, count, onSessionExpired } = setup({ accessToken: 'access-1', expiresIn: 900 });
    await client.auth.logout();

    await client.auth.me().catch(() => undefined);

    expect(count('POST', '/auth/refresh')).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('401 com access token vencido: 1 refresh single-flight e repete as chamadas', async () => {
    const { client, count } = setup({ accessToken: 'vencido', expiresIn: 900 });
    await Promise.all([client.auth.me(), client.accounts.list()]);
    expect(count('POST', '/auth/refresh')).toBe(1);
  });

  it('refresh recusado (cookie revogado): limpa o store, avisa uma vez e rejeita todas', async () => {
    const { client, jar, tokenStore, onSessionExpired } = setup({ accessToken: 'x', expiresIn: 1 });
    jar.refresh = 'refresh-revogado';

    const results = await Promise.allSettled([client.auth.me(), client.accounts.list()]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect((results[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(await tokenStore.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('403 de CSRF no refresh propaga o erro e não encerra a sessão', async () => {
    const { client, tokenStore, onSessionExpired } = setup(
      { accessToken: 'vencido', expiresIn: 900 },
      { getCsrfToken: () => null },
    );
    const error = await client.auth.me().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(await tokenStore.get()).toEqual({ accessToken: 'vencido', expiresIn: 900 });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('logout chama a API pelo cookie (sem corpo, com CSRF) e limpa o store mesmo offline', async () => {
    const ok = setup({ accessToken: 'access-1', expiresIn: 900 });
    await ok.client.auth.logout();
    expect(ok.requests[0]).toMatchObject({
      path: '/auth/logout',
      body: undefined,
      credentials: 'include',
      headers: { 'x-csrf-token': 'csrf-1' },
    });
    expect(ok.jar.refresh).toBeNull();
    expect(await ok.tokenStore.get()).toBeNull();

    const offline = setup(
      { accessToken: 'access-1', expiresIn: 900 },
      {
        fetch: async () => {
          throw new TypeError('Failed to fetch');
        },
      },
    );
    await expect(offline.client.auth.logout()).resolves.toBeUndefined();
    expect(await offline.tokenStore.get()).toBeNull();
  });

  it('duas abas com o mesmo cookie e refreshLock nunca reapresentam um cookie já trocado', async () => {
    const api = cookieApi();
    let queue = Promise.resolve();
    const lock: NonNullable<ApiClientConfig['refreshLock']> = (run) => {
      const result = queue.then(run);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    };
    const tab = () =>
      createApiClient({
        baseUrl: BASE_URL,
        session: 'cookie',
        getCsrfToken: api.getCsrfToken,
        fetch: api.fetch,
        refreshLock: lock,
      });

    const [a, b] = [tab(), tab()];
    await Promise.all([a.auth.me(), b.auth.me()]);

    expect(api.presented).toEqual(['refresh-1', 'refresh-2']);
  });
});
