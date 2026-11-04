import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  csvImportCommitRequestSchema,
  csvImportCommitResultSchema,
  csvImportPreviewRequestSchema,
  csvImportPreviewSchema,
  importBatchSchema,
} from '@financas/shared';
import { bearerAuth, errorResponses, idParamsSchema } from '../../lib/http';
import * as imports from './service';

const tags = ['Importação'];
const security = bearerAuth;

const BODY_LIMIT = 4 * 1024 * 1024;

const previewBody = csvImportPreviewRequestSchema.meta({
  description:
    'Texto do CSV (`csv`) ou linhas já separadas (`rows`). No texto: separador `;`, `,` ou tabulação; cabeçalho opcional; datas DD/MM/AAAA ou AAAA-MM-DD; valores BRL (-1.234,56), negativo = despesa.',
  examples: [
    {
      accountId: '0198f1c2-0000-7000-8000-000000000001',
      fileName: 'extrato.csv',
      csv: 'Data;Descrição;Valor\n04/11/2026;SUPERMERCADO BOM PRECO;-234,56\n05/11/2026;SALARIO ACME;5.000,00',
    },
  ],
});

z.globalRegistry.add(importBatchSchema, { id: 'ImportBatch' });

export const importsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.post(
    '/csv/preview',
    {
      bodyLimit: BODY_LIMIT,
      schema: {
        tags,
        security,
        summary: 'Pré-visualiza um CSV de extrato sem gravar nada',
        description:
          'Aceita o texto do CSV (`csv`) ou as linhas já separadas (`rows`). Valida cada linha, sugere categoria por palavras-chave e marca como duplicata a linha igual (data, tipo, valor e descrição normalizada) a uma transação já existente na conta.',
        body: previewBody,
        response: { 200: csvImportPreviewSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => imports.previewImport(db, request.userId, request.body),
  );

  app.post(
    '/csv/commit',
    {
      bodyLimit: BODY_LIMIT,
      schema: {
        tags,
        security,
        summary: 'Importa as linhas revisadas (tudo ou nada)',
        description:
          'Cria o lote e as transações numa única transação do banco. Linhas duplicadas são ignoradas, a menos que `force` seja verdadeiro.',
        body: csvImportCommitRequestSchema,
        response: { 201: csvImportCommitResultSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request, reply) =>
      reply.code(201).send(await imports.commitImport(db, request.userId, request.body)),
  );

  app.get(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Lista as importações feitas',
        response: { 200: z.array(importBatchSchema), ...errorResponses(401) },
      },
    },
    async (request) => imports.listImports(db, request.userId),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Detalha uma importação',
        params: idParamsSchema,
        response: { 200: importBatchSchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => imports.getImport(db, request.userId, request.params.id),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Desfaz uma importação (exclui o lote e as transações criadas por ele)',
        params: idParamsSchema,
        response: {
          204: z.null().describe('Importação desfeita'),
          ...errorResponses(400, 401, 404),
        },
      },
    },
    async (request, reply) => {
      await imports.deleteImport(db, request.userId, request.params.id);
      return reply.code(204).send(null);
    },
  );
};
