import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  authResponseSchema,
  cookieAuthResponseSchema,
  cookieTokensSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  tokenPairSchema,
  userSchema,
} from '@sobra/shared';
import { unauthorized } from '../../lib/errors';
import { bearerAuth, errorResponses } from '../../lib/http';
import { createPasswordHasher } from './password';
import * as auth from './service';
import {
  clearSessionCookies,
  CLIENT_HEADER,
  CSRF_HEADER,
  deliverTokens,
  readRefreshToken,
  type SessionCookieConfig,
  WEB_CLIENT,
} from './session';

const tags = ['Autenticação'];

const registerBody = registerSchema.meta({
  examples: [{ name: 'Maria Silva', email: 'maria@exemplo.com', password: 'senha-forte-123' }],
});
const loginBody = loginSchema.meta({
  examples: [{ email: 'maria@exemplo.com', password: 'senha-forte-123' }],
});

const clientHeader = z
  .string()
  .optional()
  .describe(
    `"${WEB_CLIENT}" para sessão por cookie: o refresh token vai no cookie httpOnly sobra_refresh (Path=/auth) e não no corpo. Sem o header (mobile), o refresh token vem no corpo.`,
  );

/** Loose: the parsed object replaces request.headers, which must keep authorization and cookie. */
const sessionHeaders = z.looseObject({ [CLIENT_HEADER]: clientHeader });
const cookieSessionHeaders = z.looseObject({
  [CLIENT_HEADER]: clientHeader,
  [CSRF_HEADER]: z
    .string()
    .optional()
    .describe('Obrigatório quando o refresh token vem do cookie: igual ao cookie sobra_csrf.'),
});

const tokensBody = z.union([
  tokenPairSchema.describe('Sem X-Sobra-Client: web (mobile): o par inteiro no corpo'),
  cookieTokensSchema.describe('Com X-Sobra-Client: web: o refresh token está no cookie httpOnly'),
]);
const sessionBody = z.union([
  authResponseSchema.describe('Sem X-Sobra-Client: web (mobile): o par inteiro no corpo'),
  cookieAuthResponseSchema.describe(
    'Com X-Sobra-Client: web: o refresh token está no cookie httpOnly',
  ),
]);

/** Mobile sends the refresh token in the body; the web sends no body (Fastify gives `null`). */
const refreshBody = refreshSchema.partial().nullish();

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { config } = app;
  const ctx: auth.AuthContext = {
    prisma: app.prisma,
    signAccessToken: (userId) => app.jwt.sign({ sub: userId }),
    accessTokenTtlSeconds: config.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
    passwords: createPasswordHasher(config.ARGON2_PROFILE),
  };
  const cookies: SessionCookieConfig = {
    secure: config.AUTH_COOKIE_SECURE,
    maxAgeSeconds: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
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
        headers: sessionHeaders,
        body: registerBody,
        response: { 201: sessionBody, ...errorResponses(400, 409, 429) },
      },
    },
    async (request, reply) => {
      const { user, tokens } = await auth.register(ctx, request.body);
      return reply.code(201).send({ user, tokens: deliverTokens(request, reply, tokens, cookies) });
    },
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit },
      schema: {
        tags,
        summary: 'Entra com e-mail e senha',
        headers: sessionHeaders,
        body: loginBody,
        response: { 200: sessionBody, ...errorResponses(400, 401, 429) },
      },
    },
    async (request, reply) => {
      const { user, tokens } = await auth.login(ctx, request.body);
      return { user, tokens: deliverTokens(request, reply, tokens, cookies) };
    },
  );

  app.post(
    '/auth/refresh',
    {
      config: { rateLimit },
      schema: {
        tags,
        summary: 'Troca o refresh token por um novo par de tokens',
        description:
          'Cada refresh token vale uma vez. Reusar um token já trocado revoga todas as sessões da mesma família. O token vem no corpo (mobile) ou no cookie sobra_refresh (web); pelo cookie, exige X-CSRF-Token igual ao cookie sobra_csrf (senão 403).',
        headers: cookieSessionHeaders,
        body: refreshBody,
        response: { 200: tokensBody, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request, reply) => {
      const refreshToken = readRefreshToken(request, request.body);
      if (!refreshToken) throw unauthorized(auth.INVALID_REFRESH);
      return deliverTokens(request, reply, await auth.refresh(ctx, refreshToken), cookies);
    },
  );

  app.post(
    '/auth/logout',
    {
      schema: {
        tags,
        summary: 'Encerra a sessão do refresh token informado',
        description:
          'O token vem no corpo (mobile) ou no cookie sobra_refresh (web, com X-CSRF-Token). Sempre limpa os cookies de sessão. Idempotente.',
        headers: cookieSessionHeaders,
        body: refreshBody,
        response: { 204: z.null().describe('Sessão encerrada'), ...errorResponses(400, 403) },
      },
    },
    async (request, reply) => {
      const refreshToken = readRefreshToken(request, request.body);
      if (refreshToken) await auth.logout(ctx, refreshToken);
      clearSessionCookies(reply, cookies);
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
