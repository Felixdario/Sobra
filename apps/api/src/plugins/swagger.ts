import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform, jsonSchemaTransformObject } from 'fastify-type-provider-zod';
import { APP_NAME } from '@financas/shared';

export const swaggerPlugin = fp(
  async (app) => {
    await app.register(fastifySwagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: `API ${APP_NAME}`,
          description:
            'API do controle financeiro pessoal. Valores sempre em centavos inteiros (BRL); datas locais no formato AAAA-MM-DD (fuso America/Sao_Paulo). Rotas protegidas exigem `Authorization: Bearer <accessToken>`.',
          version: '0.1.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
        tags: [
          { name: 'Sistema', description: 'Saúde da API' },
          { name: 'Autenticação', description: 'Cadastro, login e renovação de tokens' },
          { name: 'Contas', description: 'Contas e saldos' },
          { name: 'Categorias', description: 'Categorias de receitas e despesas' },
          { name: 'Transações', description: 'Receitas, despesas e transferências' },
          { name: 'Recorrências', description: 'Lançamentos que se repetem e sua materialização' },
          { name: 'Importação', description: 'Importação de extratos em CSV' },
          { name: 'Orçamentos', description: 'Orçamento mensal por categoria de despesa' },
          { name: 'Resumos', description: 'Agregações para o painel e os gráficos' },
        ],
      },
      transform: jsonSchemaTransform,
      transformObject: jsonSchemaTransformObject,
    });

    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', persistAuthorization: true },
    });
  },
  { name: 'swagger' },
);
