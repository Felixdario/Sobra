import { afterAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@financas/shared';
import { buildApp } from './app';

describe('GET /health', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('responde status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
  });
});
