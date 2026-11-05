import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CookieTokens, TokenPair } from '@sobra/shared';
import { forbidden } from '../../lib/errors';

/**
 * Session transport (ADR-034). A request with `X-Sobra-Client: web` gets the refresh token as an
 * httpOnly cookie and never in the body; every other client (mobile) keeps getting it in the body.
 */
export const CLIENT_HEADER = 'x-sobra-client';
export const WEB_CLIENT = 'web';
export const CSRF_HEADER = 'x-csrf-token';
export const REFRESH_COOKIE = 'sobra_refresh';
export const CSRF_COOKIE = 'sobra_csrf';
/** The refresh cookie only goes to /auth/*: no other route ever sees it. */
export const REFRESH_COOKIE_PATH = '/auth';

const CSRF_REJECTED =
  'Requisição recusada: o token de segurança (CSRF) está ausente ou não confere. Recarregue a página e tente de novo';

export type SessionCookieConfig = { secure: boolean; maxAgeSeconds: number };

export const isCookieClient = (request: FastifyRequest): boolean =>
  request.headers[CLIENT_HEADER] === WEB_CLIENT;

function cookieOptions(config: SessionCookieConfig) {
  const base = { secure: config.secure, sameSite: 'strict' } as const;
  return {
    refresh: { ...base, httpOnly: true, path: REFRESH_COOKIE_PATH },
    // Readable by the page on purpose (double submit): JS copies it into X-CSRF-Token.
    csrf: { ...base, httpOnly: false, path: '/' },
  } satisfies Record<string, CookieSerializeOptions>;
}

/**
 * Hands the tokens to the client in its transport: the whole pair in the body (mobile), or the
 * refresh token in the httpOnly cookie plus a fresh CSRF cookie and only the access token in the
 * body (web).
 */
export function deliverTokens(
  request: FastifyRequest,
  reply: FastifyReply,
  tokens: TokenPair,
  config: SessionCookieConfig,
): TokenPair | CookieTokens {
  if (!isCookieClient(request)) return tokens;
  const options = cookieOptions(config);
  const maxAge = config.maxAgeSeconds;
  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, { ...options.refresh, maxAge });
  reply.setCookie(CSRF_COOKIE, randomBytes(32).toString('base64url'), { ...options.csrf, maxAge });
  return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
}

export function clearSessionCookies(reply: FastifyReply, config: SessionCookieConfig): void {
  const options = cookieOptions(config);
  reply.clearCookie(REFRESH_COOKIE, options.refresh);
  reply.clearCookie(CSRF_COOKIE, options.csrf);
}

function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The refresh token of the request: from the body (mobile) or from the cookie (web). The browser
 * attaches the cookie on its own, so using it requires the double-submit check: `X-CSRF-Token`
 * must equal the `sobra_csrf` cookie, which another site can neither read nor set. Returns `null`
 * when there is no token at all.
 */
export function readRefreshToken(
  request: FastifyRequest,
  body: { refreshToken?: string | undefined } | null | undefined,
): string | null {
  if (body?.refreshToken) return body.refreshToken;
  const fromCookie = request.cookies[REFRESH_COOKIE];
  if (!fromCookie) return null;

  const header = request.headers[CSRF_HEADER];
  const expected = request.cookies[CSRF_COOKIE];
  if (typeof header !== 'string' || !expected || !sameToken(header, expected)) {
    throw forbidden(CSRF_REJECTED);
  }
  return fromCookie;
}
