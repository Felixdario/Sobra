import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  categoryCreateSchema,
  categoryKindSchema,
  categorySchema,
  categoryUpdateSchema,
  fromQuery,
} from '@financas/shared';
import { bearerAuth, errorResponses, idParamsSchema } from '../../lib/http';
import * as categories from './service';

z.globalRegistry.add(categorySchema, { id: 'Category' });

const tags = ['Categorias'];
const security = bearerAuth;

const listQuery = z.object({ kind: fromQuery(categoryKindSchema) });

const createBody = categoryCreateSchema.meta({
  examples: [{ name: 'Pets', kind: 'expense', color: '#D97706', icon: 'paw' }],
});

export const categoriesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate);
  const db = app.prisma;

  app.get(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Lista as categorias (filtro opcional por tipo)',
        querystring: listQuery,
        response: { 200: z.array(categorySchema), ...errorResponses(400, 401) },
      },
    },
    async (request) => categories.listCategories(db, request.userId, request.query),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Detalha uma categoria',
        params: idParamsSchema,
        response: { 200: categorySchema, ...errorResponses(400, 401, 404) },
      },
    },
    async (request) => categories.getCategory(db, request.userId, request.params.id),
  );

  app.post(
    '',
    {
      schema: {
        tags,
        security,
        summary: 'Cria uma categoria',
        body: createBody,
        response: { 201: categorySchema, ...errorResponses(400, 401, 409) },
      },
    },
    async (request, reply) =>
      reply.code(201).send(await categories.createCategory(db, request.userId, request.body)),
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Atualiza nome, cor ou ícone (o tipo não muda)',
        params: idParamsSchema,
        body: categoryUpdateSchema,
        response: { 200: categorySchema, ...errorResponses(400, 401, 404, 409) },
      },
    },
    async (request) =>
      categories.updateCategory(db, request.userId, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        security,
        summary: 'Exclui uma categoria que não está em uso',
        params: idParamsSchema,
        response: {
          204: z.null().describe('Categoria excluída'),
          ...errorResponses(400, 401, 404, 409),
        },
      },
    },
    async (request, reply) => {
      await categories.deleteCategory(db, request.userId, request.params.id);
      return reply.code(204).send(null);
    },
  );
};
