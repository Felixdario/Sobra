import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { installZodPtBR } from '@sobra/shared';
import { type Env, loadEnv, sqlitePath } from './config/env';
import { accountsRoutes } from './modules/accounts/routes';
import { authRoutes } from './modules/auth/routes';
import { budgetsRoutes } from './modules/budgets/routes';
import { categoriesRoutes } from './modules/categories/routes';
import { healthRoutes } from './modules/health/routes';
import { importsRoutes } from './modules/imports/routes';
import { recurringRoutes } from './modules/recurring/routes';
import { summaryRoutes } from './modules/summary/routes';
import { transactionsRoutes } from './modules/transactions/routes';
import { authPlugin } from './plugins/auth';
import { errorsPlugin } from './plugins/errors';
import { prismaPlugin } from './plugins/prisma';
import { swaggerPlugin } from './plugins/swagger';
import { zodPlugin } from './plugins/zod';

export type BuildAppOptions = {
  env?: Env;
  logger?: FastifyServerOptions['logger'];
};

export async function buildApp({ env = loadEnv(), logger = false }: BuildAppOptions = {}) {
  installZodPtBR();

  const app = Fastify({ logger });
  app.decorate('config', env);

  await app.register(zodPlugin);
  await app.register(errorsPlugin);
  await app.register(cors, { origin: env.CORS_ORIGINS });
  await app.register(rateLimit, { global: false });
  await app.register(prismaPlugin, { sqliteFile: sqlitePath(env.DATABASE_URL) });
  await app.register(authPlugin, {
    secret: env.JWT_SECRET,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  });
  await app.register(swaggerPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(accountsRoutes, { prefix: '/accounts' });
  await app.register(categoriesRoutes, { prefix: '/categories' });
  await app.register(transactionsRoutes, { prefix: '/transactions' });
  await app.register(recurringRoutes, { prefix: '/recurring' });
  await app.register(importsRoutes, { prefix: '/imports' });
  await app.register(budgetsRoutes, { prefix: '/budgets' });
  await app.register(summaryRoutes, { prefix: '/summary' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
