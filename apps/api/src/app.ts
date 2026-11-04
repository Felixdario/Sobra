import Fastify, { type FastifyServerOptions } from 'fastify';
import { type HealthResponse } from '@financas/shared';

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok' }));

  return app;
}
