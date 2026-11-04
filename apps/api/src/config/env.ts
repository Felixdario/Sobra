import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';

const DEV_JWT_SECRET = 'dev-only-secret-change-me-in-production-0000';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z
      .string()
      .startsWith('file:', { error: 'DATABASE_URL deve ser um arquivo SQLite (file:...)' })
      .default('file:./prisma/dev.db'),
    JWT_SECRET: z
      .string()
      .min(32, { error: 'JWT_SECRET deve ter no mínimo 32 caracteres' })
      .optional(),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:8081')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
  })
  .transform(({ JWT_SECRET, ...env }, ctx) => {
    if (JWT_SECRET === undefined && env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET é obrigatório em produção',
      });
      return z.NEVER;
    }
    return { ...env, JWT_SECRET: JWT_SECRET ?? DEV_JWT_SECRET };
  });

export type Env = z.infer<typeof envSchema>;
export type EnvInput = z.input<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const filled = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(filled);
  if (!result.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

/** Absolute path of a `file:` SQLite URL, resolved from the API package root like the Prisma CLI. */
export function sqlitePath(databaseUrl: string, root = process.cwd()): string {
  const path = databaseUrl.slice('file:'.length);
  return isAbsolute(path) ? path : resolve(root, path);
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}
