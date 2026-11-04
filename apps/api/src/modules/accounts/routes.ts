import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  accountCreateSchema,
  accountSchema,
  accountUpdateSchema,
  fromQuery,
} from '@financas/shared';
import { bearerAuth, errorResponses, idParamsSchema } from '../../lib/http';
import * as accounts from './service';

z.globalRegistry.add(accountSchema, { id: 'Account' });

const tags = ['Contas'];
const security = bearerAuth;

const listQuery = z.object({
  includeArchived: fromQuery(z.stringbool()).transform((value) => value ?? false),
});

const createBody = accountCreateSchema.meta({
  examples: [
    {
      name: 'Nubank',
      type: 'checking',
      initialBalance: 150000,
      color: '#8A05BE',
      icon: 'credit-card',
    },
  ],
});

export const accountsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.get(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Lista as contas com saldo calculado',
        description:
          'Saldo = saldo inicial + receitas − despesas − transferências enviadas + transferências recebidas. Arquivadas só com `includeArchived=true`.',
        querystring: listQuery,
        response: { 200: z.array(accountSchema), ...errorResponses(400, 401) },
      },
    },
    async (request) => accounts.listAccounts(db, request.userId, request.query),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Detalha uma conta',
        params: idParamsSchema,
        response: { 200: accountSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => accounts.getAccount(db, request.userId, request.params.id),
  );

  app.post(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Cria uma conta',
        body: createBody,
        response: { 201: accountSchema, ...errorResponses(400, 401) },
      },
    },
    async (request, reply) =>
      reply.code(201).send(await accounts.createAccount(db, request.userId, request.body)),
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Atualiza uma conta (inclusive arquivar/desarquivar)',
        params: idParamsSchema,
        body: accountUpdateSchema,
        response: { 200: accountSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => accounts.updateAccount(db, request.userId, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Exclui uma conta sem movimentações; com movimentações, arquiva',
        params: idParamsSchema,
        response: {
          200: accountSchema.describe('A conta tinha movimentações e foi arquivada'),
          204: z.null().describe('Conta excluída'),
          ...errorResponses(400, 401, 404),
        },
      },
    },
    async (request, reply) => {
      const result = await accounts.deleteAccount(db, request.userId, request.params.id);
      if ('archived' in result) return reply.code(200).send(result.archived);
      return reply.code(204).send(null);
    },
  );
};
