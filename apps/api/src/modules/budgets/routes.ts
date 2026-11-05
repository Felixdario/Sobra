import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  budgetCopySchema,
  budgetQuerySchema,
  budgetSchema,
  budgetUpsertSchema,
} from '@sobra/shared';
import { bearerAuth, errorResponses, idParamsSchema } from '../../lib/http';
import * as budgets from './service';

z.globalRegistry.add(budgetSchema, { id: 'Budget' });

const tags = ['Orçamentos'];
const security = bearerAuth;

const upsertBody = budgetUpsertSchema.meta({
  examples: [
    { categoryId: '0195f2a4-7c1e-7d3a-9b8c-1a2b3c4d5e6f', month: '2026-11', amount: 80000 },
  ],
});

const copyBody = budgetCopySchema.meta({ examples: [{ from: '2026-10', to: '2026-11' }] });

export const budgetsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.get(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Lista os orçamentos do mês com o gasto realizado',
        description:
          '`spent` soma as despesas da categoria no mês (transferências não contam); `remaining` = `amount` − `spent` e fica negativo quando o orçamento estoura.',
        querystring: budgetQuerySchema,
        response: { 200: z.array(budgetSchema), ...errorResponses(400, 401) },
      },
    },
    async (request) => budgets.listBudgets(db, request.userId, request.query.month),
  );

  app.put(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Cria ou atualiza o orçamento de uma categoria de despesa no mês',
        body: upsertBody,
        response: { 200: budgetSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => budgets.upsertBudget(db, request.userId, request.body),
  );

  app.post(
    '/copy',
    {
      schema: {
        tags,
        security,
        summary: 'Copia os orçamentos de um mês para outro',
        description:
          'Orçamentos que o mês de destino já tem são mantidos. Responde com todos os orçamentos do mês de destino.',
        body: copyBody,
        response: { 200: z.array(budgetSchema), ...errorResponses(400, 401) },
      },
    },
    async (request) => budgets.copyBudgets(db, request.userId, request.body),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Exclui um orçamento',
        params: idParamsSchema,
        response: {
          204: z.null().describe('Orçamento excluído'),
          ...errorResponses(400, 401, 404),
        },
      },
    },
    async (request, reply) => {
      await budgets.deleteBudget(db, request.userId, request.params.id);
      return reply.code(204).send(null);
    },
  );
};
