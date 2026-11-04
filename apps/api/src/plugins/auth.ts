import fastifyJwt from '@fastify/jwt';
import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { unauthorized } from '../lib/errors';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** `onRequest` hook for protected routes: verifies the access token and sets `request.userId`. */
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    userId: string;
  }
}

export type AuthPluginOptions = { secret: string; accessTokenTtlSeconds: number };

export const authPlugin = fp<AuthPluginOptions>(
  async (app, { secret, accessTokenTtlSeconds }) => {
    await app.register(fastifyJwt, {
      secret,
      sign: { expiresIn: accessTokenTtlSeconds },
    });

    app.decorateRequest('userId', '');

    app.decorate('authenticate', async (request: FastifyRequest) => {
      try {
        const { sub } = await request.jwtVerify<{ sub: string }>();
        request.userId = sub;
      } catch {
        throw unauthorized('Token de acesso ausente, inválido ou expirado');
      }
    });
  },
  { name: 'auth' },
);
