import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  balanceHistorySchema,
  budgetQuerySchema,
  budgetVsActualSchema,
  incomeVsExpenseSeriesSchema,
  monthSummarySchema,
  spendingByCategorySchema,
  summaryMonthQuerySchema,
  summaryRangeQuerySchema,
} from '@financas/shared';
import { bearerAuth, errorResponses } from '../../lib/http';
import * as summary from './service';

z.globalRegistry.add(monthSummarySchema, { id: 'MonthSummary' });

const tags = ['Resumos'];
const security = bearerAuth;
const TRANSFERS_NOTE =
  'Receitas e despesas vêm das transações `income` e `expense`; transferências só movem saldo entre contas e não entram nelas.';

export const summaryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.get(
    '/month',
    {
      schema: {
        tags,
        security,
        summary: 'Resumo do mês comparado ao mês anterior',
        description: `${TRANSFERS_NOTE} \`balance\` é o saldo total no fim do mês (contas não arquivadas, ou só \`accountId\`). \`savingsRate\` = (receitas − despesas) / receitas × 100, nulo sem receitas. \`delta.*.percent\` é nulo quando o mês anterior é zero. Percentuais sempre na escala 0–100.`,
        querystring: summaryMonthQuerySchema,
        response: { 200: monthSummarySchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => summary.monthSummary(db, request.userId, request.query),
  );

  app.get(
    '/income-vs-expense',
    {
      schema: {
        tags,
        security,
        summary: 'Receitas × despesas por mês',
        description: `${TRANSFERS_NOTE} Um ponto por mês de \`from\` a \`to\` (até ${summary.MAX_RANGE_MONTHS.month} meses), meses sem movimento com zero; \`net\` = receitas − despesas (resultado do mês, não saldo). \`granularity\` é ignorado.`,
        querystring: summaryRangeQuerySchema,
        response: { 200: incomeVsExpenseSeriesSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => summary.incomeVsExpense(db, request.userId, request.query),
  );

  app.get(
    '/spending-by-category',
    {
      schema: {
        tags,
        security,
        summary: 'Despesas do mês por categoria',
        description:
          'Ordenadas da maior para a menor; `percent` é a participação no total de despesas do mês (0–100).',
        querystring: summaryMonthQuerySchema,
        response: { 200: spendingByCategorySchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => summary.spendingByCategory(db, request.userId, request.query),
  );

  app.get(
    '/balance-history',
    {
      schema: {
        tags,
        security,
        summary: 'Evolução do saldo total',
        description: `Saldo acumulado no fim de cada dia ou mês (padrão \`month\`), partindo do saldo inicial das contas. Períodos sem movimento repetem o valor anterior. Limite: ${summary.MAX_RANGE_MONTHS.month} meses (mensal) ou ${summary.MAX_RANGE_MONTHS.day} meses (diário).`,
        querystring: summaryRangeQuerySchema,
        response: { 200: balanceHistorySchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => summary.balanceHistory(db, request.userId, request.query),
  );

  app.get(
    '/budget-vs-actual',
    {
      schema: {
        tags,
        security,
        summary: 'Orçado × realizado por categoria no mês',
        description:
          '`percentUsed` = realizado / orçado na escala 0–100 (acima de 100 = estourado).',
        querystring: budgetQuerySchema,
        response: { 200: budgetVsActualSchema, ...errorResponses(400, 401) },
      },
    },
    async (request) => summary.budgetVsActual(db, request.userId, request.query.month),
  );
};
