import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  recurringCreateSchema,
  recurringSchema,
  recurringSyncResultSchema,
  recurringUpdateSchema,
  toLocalDateKey,
} from '@sobra/shared';
import { bearerAuth, errorResponses, idParamsSchema } from '../../lib/http';
import * as recurring from './service';

z.globalRegistry.add(recurringSchema, { id: 'Recurring' });

const tags = ['Recorrências'];
const security = bearerAuth;

const createBody = recurringCreateSchema.meta({
  examples: [
    {
      rule: { frequency: 'monthly', interval: 1, startDate: '2026-11-05', dayOfMonth: 5 },
      template: {
        type: 'expense',
        accountId: '0198f1c2-0000-7000-8000-000000000001',
        categoryId: '0198f1c2-0000-7000-8000-000000000002',
        amount: 150000,
        description: 'Aluguel',
      },
    },
  ],
});

const today = () => toLocalDateKey(new Date());

export const recurringRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.get(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Lista as recorrências',
        response: { 200: z.array(recurringSchema), ...errorResponses(401) },
      },
    },
    async (request) => recurring.listRecurring(db, request.userId),
  );

  app.post(
    '/sync',
    {
      schema: {
        tags,
        security,
        summary: 'Gera as ocorrências devidas até hoje',
        description:
          'Idempotente: cada ocorrência (recorrência + data) é criada uma única vez. Também roda automaticamente no início de GET /transactions.',
        response: { 200: recurringSyncResultSchema, ...errorResponses(401) },
      },
    },
    async (request) => ({
      created: await recurring.syncDueRecurring(db, request.userId, today()),
    }),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Detalha uma recorrência',
        params: idParamsSchema,
        response: { 200: recurringSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => recurring.getRecurring(db, request.userId, request.params.id),
  );

  app.post(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Cria uma recorrência',
        description:
          'Mensal com dia 29 a 31 cai no último dia dos meses mais curtos; anual em 29/02 cai em 28/02 nos anos não bissextos. Sem `dayOfMonth`, usa o dia da data inicial.',
        body: createBody,
        response: { 201: recurringSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request, reply) =>
      reply.code(201).send(await recurring.createRecurring(db, request.userId, request.body)),
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Atualiza regra, modelo ou pausa/reativa uma recorrência',
        description:
          'Mudanças valem para as próximas ocorrências; as já geradas não são alteradas. Ao reativar, não gera ocorrências do período pausado.',
        params: idParamsSchema,
        body: recurringUpdateSchema,
        response: { 200: recurringSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) =>
      recurring.updateRecurring(db, request.userId, request.params.id, request.body, today()),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Exclui uma recorrência (as transações já geradas permanecem)',
        params: idParamsSchema,
        response: {
          204: z.null().describe('Recorrência excluída'),
          ...errorResponses(400, 401, 404),
        },
      },
    },
    async (request, reply) => {
      await recurring.deleteRecurring(db, request.userId, request.params.id);
      return reply.code(204).send(null);
    },
  );
};
