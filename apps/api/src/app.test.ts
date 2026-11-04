import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@financas/shared';
import type { App } from './app';
import { createTestApp, errorOf } from './test/helpers';

describe('app', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
  });

  it('rota inexistente responde 404 no formato de erro', async () => {
    const response = await app.inject({ method: 'GET', url: '/nao-existe?x=1' });

    expect(response.statusCode).toBe(404);
    expect(errorOf(response)).toEqual({
      code: 'NOT_FOUND',
      message: 'Rota GET /nao-existe não encontrada',
    });
  });

  it('JSON malformado responde 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"email":',
    });

    expect(response.statusCode).toBe(400);
    expect(errorOf(response).code).toBe('BAD_REQUEST');
  });

  it('GET /docs serve a UI e /docs/json lista as rotas com bearer auth', async () => {
    const ui = await app.inject({ method: 'GET', url: '/docs' });
    expect(ui.statusCode).toBe(200);
    expect(ui.headers['content-type']).toContain('text/html');

    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ scheme: 'bearer' });
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/auth/register',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/me',
        '/accounts',
        '/accounts/{id}',
        '/categories',
        '/categories/{id}',
        '/transactions',
        '/transactions/{id}',
        '/recurring',
        '/recurring/{id}',
        '/recurring/sync',
        '/imports',
        '/imports/{id}',
        '/imports/csv/preview',
        '/imports/csv/commit',
        '/budgets',
        '/budgets/{id}',
        '/budgets/copy',
        '/summary/month',
        '/summary/income-vs-expense',
        '/summary/spending-by-category',
        '/summary/balance-history',
        '/summary/budget-vs-actual',
      ]),
    );
    expect(spec.paths['/accounts'].get.security).toEqual([{ bearerAuth: [] }]);
  });

  it('CORS libera só as origens configuradas', async () => {
    const allowed = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'GET' },
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: 'https://malicioso.example', 'access-control-request-method': 'GET' },
    });
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
