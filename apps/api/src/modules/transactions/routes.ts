import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  paginated,
  transactionCreateSchema,
  transactionFiltersSchema,
  transactionSchema,
  transactionUpdateSchema,
} from '@sobra/shared';
import { bearerAuth, errorResponses, idParamsSchema } from '../../lib/http';
import * as transactions from './service';

z.globalRegistry.add(transactionSchema, { id: 'Transaction' });

const tags = ['Transações'];
const security = bearerAuth;

const createBody = transactionCreateSchema.meta({
  examples: [
    {
      type: 'expense',
      accountId: '0198f1c2-0000-7000-8000-000000000001',
      categoryId: '0198f1c2-0000-7000-8000-000000000002',
      amount: 4590,
      date: '2026-11-04',
      description: 'Supermercado',
    },
    {
      type: 'transfer',
      accountId: '0198f1c2-0000-7000-8000-000000000001',
      toAccountId: '0198f1c2-0000-7000-8000-000000000003',
      amount: 100000,
      date: '2026-11-05',
      description: 'Reserva de emergência',
    },
  ],
});

export const transactionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.get(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Lista transações com filtros, busca, ordenação e paginação',
        description:
          'Antes de listar, materializa as recorrências devidas até hoje (fuso de São Paulo). `accountId` inclui transferências em que a conta é origem ou destino. `search` procura em descrição e observações, sem diferenciar maiúsculas. `sort` no formato `campo:direção` (date, amount, description; asc ou desc).',
        querystring: transactionFiltersSchema,
        response: { 200: paginated(transactionSchema), ...errorResponses(400, 401) },
      },
    },
    async (request) => transactions.listTransactions(db, request.userId, request.query),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Detalha uma transação',
        params: idParamsSchema,
        response: { 200: transactionSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => transactions.getTransaction(db, request.userId, request.params.id),
  );

  app.post(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Cria uma receita, despesa ou transferência',
        description:
          'Receita só aceita categoria de receita e despesa só de despesa. Transferência exige conta de destino diferente da origem. Contas arquivadas não recebem novas transações.',
        body: createBody,
        response: { 201: transactionSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request, reply) =>
      reply.code(201).send(await transactions.createTransaction(db, request.userId, request.body)),
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Atualiza uma transação (inclusive o tipo)',
        description:
          'Os campos enviados são mesclados à transação atual e o resultado é validado como uma criação. `notes: null` remove as observações.',
        params: idParamsSchema,
        body: transactionUpdateSchema,
        response: { 200: transactionSchema, ...errorResponses(400, 401, 404, 409) },
      },
    },
    async (request) =>
      transactions.updateTransaction(db, request.userId, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Exclui uma transação',
        params: idParamsSchema,
        response: {
          204: z.null().describe('Transação excluída'),
          ...errorResponses(400, 401, 404),
        },
      },
    },
    async (request, reply) => {
      await transactions.deleteTransaction(db, request.userId, request.params.id);
      return reply.code(204).send(null);
    },
  );
};
