import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { healthResponseSchema } from '@sobra/shared';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Sistema'],
        summary: 'Verifica se a API está no ar',
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({ status: 'ok' as const }),
  );
};
