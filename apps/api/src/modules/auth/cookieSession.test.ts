import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookieAuthResponseSchema, cookieTokensSchema } from '@sobra/shared';
import type { App } from '../../app';
import { loadEnv } from '../../config/env';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';
import { hashRefreshToken } from './tokens';

const WEB = { 'x-sobra-client': 'web' };
const THIRTY_DAYS = 30 * 24 * 60 * 60;

type Session = { refresh: string; csrf: string };

function cookie(response: LightMyRequestResponse, name: string) {
  return response.cookies.find((c) => c.name === name);
}

function sessionOf(response: LightMyRequestResponse): Session {
  const refresh = cookie(response, 'sobra_refresh')?.value;
  const csrf = cookie(response, 'sobra_csrf')?.value;
  if (!refresh || !csrf) throw new Error(`sem cookies de sessão: ${response.statusCode}`);
  return { refresh, csrf };
}

describe('sessão do web por cookie httpOnly + CSRF', () => {
  let app: App;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    user = await registerUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const loginWeb = () =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: WEB,
      payload: { email: user.user.email, password: user.password },
    });

  /** What the browser sends: both cookies attached by itself, the CSRF header copied by JS. */
  const withCookies = (
    url: '/auth/refresh' | '/auth/logout',
    session: Session,
    csrfHeader: string | null = session.csrf,
  ) =>
    app.inject({
      method: 'POST',
      url,
      headers: { ...WEB, ...(csrfHeader === null ? {} : { 'x-csrf-token': csrfHeader }) },
      cookies: { sobra_refresh: session.refresh, sobra_csrf: session.csrf },
    });

  it('login web: refresh token só no cookie httpOnly, nunca no corpo', async () => {
    const response = await loginWeb();

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tokens).not.toHaveProperty('refreshToken');
    expect(cookieAuthResponseSchema.parse(body).user.id).toBe(user.user.id);

    const refresh = cookie(response, 'sobra_refresh');
    expect(refresh).toMatchObject({
      httpOnly: true,
      sameSite: 'Strict',
      path: '/auth',
      maxAge: THIRTY_DAYS,
    });
    expect(refresh?.secure).toBeUndefined();
    expect(response.body).not.toContain(refresh?.value);
    const stored = await app.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refresh?.value ?? '') },
    });
    expect(stored?.userId).toBe(user.user.id);

    const csrf = cookie(response, 'sobra_csrf');
    expect(csrf).toMatchObject({ sameSite: 'Strict', path: '/', maxAge: THIRTY_DAYS });
    expect(csrf?.httpOnly).toBeUndefined();
    expect(csrf?.value).toMatch(/^[\w-]{43}$/);

    const me = await app.inject({
      method: 'GET',
      url: '/me',
      headers: authHeader(body.tokens.accessToken),
    });
    expect(me.statusCode).toBe(200);
  });

  it('cadastro web também entrega a sessão por cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: WEB,
      payload: { name: 'Web', email: 'web-cadastro@exemplo.com', password: 'senha-forte-123' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().tokens).not.toHaveProperty('refreshToken');
    expect(cookie(response, 'sobra_refresh')?.httpOnly).toBe(true);
  });

  it('refresh pelo cookie com CSRF certo rotaciona os cookies', async () => {
    const first = sessionOf(await loginWeb());
    const response = await withCookies('/auth/refresh', first);

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty('refreshToken');
    expect(cookieTokensSchema.parse(response.json()).expiresIn).toBe(900);
    const next = sessionOf(response);
    expect(next.refresh).not.toBe(first.refresh);
    expect(next.csrf).not.toBe(first.csrf);
    expect((await withCookies('/auth/refresh', next)).statusCode).toBe(200);
  });

  it('sem CSRF, com CSRF errado ou sem o cookie de CSRF responde 403 e não gasta o token', async () => {
    const session = sessionOf(await loginWeb());

    const missing = await withCookies('/auth/refresh', session, null);
    expect(missing.statusCode).toBe(403);
    expect(errorOf(missing)).toEqual({
      code: 'FORBIDDEN',
      message: expect.stringContaining('token de segurança (CSRF)'),
    });

    expect((await withCookies('/auth/refresh', session, 'outro-valor')).statusCode).toBe(403);
    expect((await withCookies('/auth/refresh', session, '')).statusCode).toBe(403);

    const noCsrfCookie = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { ...WEB, 'x-csrf-token': session.csrf },
      cookies: { sobra_refresh: session.refresh },
    });
    expect(noCsrfCookie.statusCode).toBe(403);

    expect((await withCookies('/auth/refresh', session)).statusCode).toBe(200);
  });

  it('reusar um cookie de refresh já trocado derruba a família inteira', async () => {
    const first = sessionOf(await loginWeb());
    const second = sessionOf(await withCookies('/auth/refresh', first));

    const replay = await withCookies('/auth/refresh', first);
    expect(replay.statusCode).toBe(401);
    expect((await withCookies('/auth/refresh', second)).statusCode).toBe(401);
  });

  it('refresh web sem cookie nem corpo responde 401 (a sessão acabou)', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/refresh', headers: WEB });
    expect(response.statusCode).toBe(401);
    expect(errorOf(response).code).toBe('UNAUTHORIZED');
  });

  it('logout pelo cookie revoga a sessão e limpa os dois cookies', async () => {
    const session = sessionOf(await loginWeb());

    const response = await withCookies('/auth/logout', session);
    expect(response.statusCode).toBe(204);
    for (const name of ['sobra_refresh', 'sobra_csrf']) {
      const cleared = cookie(response, name);
      expect(cleared?.value).toBe('');
      expect(cleared?.expires?.getTime()).toBeLessThan(Date.now());
    }
    expect(cookie(response, 'sobra_refresh')?.path).toBe('/auth');
    expect((await withCookies('/auth/refresh', session)).statusCode).toBe(401);
  });

  it('logout pelo cookie sem CSRF responde 403 e mantém a sessão', async () => {
    const session = sessionOf(await loginWeb());

    expect((await withCookies('/auth/logout', session, null)).statusCode).toBe(403);
    expect((await withCookies('/auth/refresh', session)).statusCode).toBe(200);
  });

  it('logout sem token nenhum é 204 e limpa os cookies (idempotente)', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/logout', headers: WEB });
    expect(response.statusCode).toBe(204);
    expect(cookie(response, 'sobra_refresh')?.value).toBe('');
  });

  it('mobile (sem o header) continua com o par inteiro no corpo e sem cookies', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: user.user.email, password: user.password },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().tokens.refreshToken).toEqual(expect.any(String));
    expect(login.cookies).toEqual([]);

    const refreshed = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: login.json().tokens.refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().refreshToken).toEqual(expect.any(String));
    expect(refreshed.cookies).toEqual([]);
  });

  it('CORS com credenciais só para as origens do env', async () => {
    const preflight = (origin: string) =>
      app.inject({
        method: 'OPTIONS',
        url: '/auth/refresh',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'x-sobra-client,x-csrf-token',
        },
      });

    const allowed = await preflight('http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const blocked = await preflight('https://malicioso.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('o OpenAPI descreve os dois formatos de resposta e o 403', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json();
    const login = spec.paths['/auth/login'].post;
    expect(login.responses['200'].content['application/json'].schema.anyOf).toHaveLength(2);
    expect(login.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ in: 'header', name: 'x-sobra-client' })]),
    );
    const refresh = spec.paths['/auth/refresh'].post;
    expect(refresh.responses).toHaveProperty('403');
    expect(refresh.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ in: 'header', name: 'x-csrf-token' })]),
    );
  });
});

describe('atributo Secure dos cookies de sessão', () => {
  it('AUTH_COOKIE_SECURE=true marca os dois cookies como Secure', async () => {
    const app = await createTestApp({ AUTH_COOKIE_SECURE: 'true' });
    try {
      const user = await registerUser(app);
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: WEB,
        payload: { email: user.user.email, password: user.password },
      });
      expect(cookie(response, 'sobra_refresh')?.secure).toBe(true);
      expect(cookie(response, 'sobra_csrf')?.secure).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('é ligado por padrão em produção, desligado em dev e proibido desligar em produção', () => {
    const production = { NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) };
    expect(loadEnv(production).AUTH_COOKIE_SECURE).toBe(true);
    expect(loadEnv({ NODE_ENV: 'development' }).AUTH_COOKIE_SECURE).toBe(false);
    expect(() => loadEnv({ ...production, AUTH_COOKIE_SECURE: 'false' })).toThrow(
      /AUTH_COOKIE_SECURE=false é proibido em produção/,
    );
  });

  it('CORS_ORIGINS recusa "*"', () => {
    expect(() => loadEnv({ CORS_ORIGINS: 'http://localhost:5173,*' })).toThrow(/não aceita "\*"/);
  });
});
