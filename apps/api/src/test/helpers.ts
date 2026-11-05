import { randomUUID } from 'node:crypto';
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { LightMyRequestResponse } from 'fastify';
import { inject } from 'vitest';
import type { z } from 'zod';
import {
  apiErrorSchema,
  type AuthResponse,
  authResponseSchema,
  type registerSchema,
} from '@sobra/shared';
import { type App, buildApp } from '../app';
import { loadEnv } from '../config/env';

/**
 * App wired to a private SQLite file copied from the migrated template, so test files run in
 * parallel without sharing data. Call `app.close()` in `afterAll`; the global teardown deletes
 * the files.
 */
export async function createTestApp(env: Record<string, string> = {}): Promise<App> {
  const template = inject('templateDatabase');
  const file = join(dirname(template), `${randomUUID()}.db`);
  copyFileSync(template, file);

  const app = await buildApp({
    env: loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: `file:${file}`,
      JWT_SECRET: 'test-secret-with-at-least-thirty-two-chars',
      AUTH_RATE_LIMIT_MAX: '10000',
      ARGON2_PROFILE: 'test',
      ...env,
    }),
  });
  await app.ready();
  return app;
}

export type TestUser = AuthResponse & { password: string };

export async function registerUser(
  app: App,
  overrides: Partial<z.input<typeof registerSchema>> = {},
): Promise<TestUser> {
  const input = {
    name: 'Pessoa Teste',
    email: `pessoa-${randomUUID()}@exemplo.com`,
    password: 'senha-super-secreta',
    ...overrides,
  };
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: input });
  if (response.statusCode !== 201) {
    throw new Error(`registerUser falhou (${response.statusCode}): ${response.body}`);
  }
  return { ...authResponseSchema.parse(response.json()), password: input.password };
}

export function authHeader(user: Pick<AuthResponse, 'tokens'> | string) {
  const token = typeof user === 'string' ? user : user.tokens.accessToken;
  return { authorization: `Bearer ${token}` };
}

/** Parsed `{ error }` body, asserting the shared error format. */
export function errorOf(response: LightMyRequestResponse) {
  return apiErrorSchema.parse(response.json()).error;
}
