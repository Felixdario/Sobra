import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  authResponseSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  tokenPairSchema,
  userSchema,
} from '@sobra/shared';
import { bearerAuth, errorResponses } from '../../lib/http';
import { createPasswordHasher } from './password';
import * as auth from './service';

const tags = ['Autenticação'];

const registerBody = registerSchema.meta({
  examples: [{ name: 'Maria Silva', email: 'maria@exemplo.com', password: 'senha-forte-123' }],
});
const loginBody = loginSchema.meta({
  examples: [{ email: 'maria@exemplo.com', password: 'senha-forte-123' }],
});

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { config } = app;
  const ctx: auth.AuthContext = {
    prisma: app.prisma,
    signAccessToken: (userId) => app.jwt.sign({ sub: userId }),
    accessTokenTtlSeconds: config.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
    passwords: createPasswordHasher(config.ARGON2_PROFILE),
  };
  const rateLimit = { max: config.AUTH_RATE_LIMIT_MAX, timeWindow: config.AUTH_RATE_LIMIT_WINDOW };

  app.post(
    '/auth/register',
    {
      config: { rateLimit },
      schema: {
        tags,
        summary: 'Cria uma conta de usuário',
        description:
          'Cria o usuário com categorias padrão em pt-BR e a conta "Carteira", e já devolve os tokens.',
        body: registerBody,
        response: { 201: authResponseSchema, ...errorResponses(400, 409, 429) },
      },
    },
    async (request, reply) => reply.code(201).send(await auth.register(ctx, request.body)),
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit },
      schema: {
        tags,
        summary: 'Entra com e-mail e senha',
        body: loginBody,
        response: { 200: authResponseSchema, ...errorResponses(400, 401, 429) },
      },
    },
    async (request) => auth.login(ctx, request.body),
  );

  app.post(
    '/auth/refresh',
    {
      config: { rateLimit },
      schema: {
        tags,
        summary: 'Troca o refresh token por um novo par de tokens',
        description:
          'Cada refresh token vale uma vez. Reusar um token já trocado revoga todas as sessões da mesma família.',
        body: refreshSchema,
        response: { 200: tokenPairSchema, ...errorResponses(400, 401, 429) },
      },
    },
    async (request) => auth.refresh(ctx, request.body.refreshToken),
  );

  app.post(
    '/auth/logout',
    {
      schema: {
        tags,
        summary: 'Encerra a sessão do refresh token informado',
        body: refreshSchema,
        response: { 204: z.null().describe('Sessão encerrada'), ...errorResponses(400) },
      },
    },
    async (request, reply) => {
      await auth.logout(ctx, request.body.refreshToken);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/me',
    {
      onRequest: app.authenticate,
      schema: {
        tags,
        summary: 'Usuário autenticado',
        security: bearerAuth,
        response: { 200: userSchema, ...errorResponses(401) },
      },
    },
    async (request) => auth.getProfile(app.prisma, request.userId),
  );
};
