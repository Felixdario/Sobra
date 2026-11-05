import {
  apiErrorSchema,
  authResponseSchema,
  cookieAuthResponseSchema,
  cookieTokensSchema,
  tokenPairSchema,
  type User,
} from '@sobra/shared';
import type { z } from 'zod';
import { ApiError, CLIENT_ERROR_CODES, CLIENT_ERROR_MESSAGES, httpErrorMessage } from './errors';
import {
  type AbortSignalLike,
  createAbortController,
  type FetchFn,
  type FetchRequestInit,
  startTimer,
} from './runtime';
import type { AccessTokenStore, TokenStore } from './tokenStore';

export const DEFAULT_TIMEOUT_MS = 15_000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

/** Per-call options. `signal` is what TanStack Query passes to `queryFn` for cancellation. */
export type RequestOptions = { signal?: AbortSignalLike };

export type Call = {
  method: HttpMethod;
  path: string;
  query?: Readonly<Record<string, QueryValue>> | undefined;
  body?: unknown;
  /** Sends the bearer token and renews the session on 401. Default `true`. */
  auth?: boolean;
  signal?: AbortSignalLike | undefined;
};

export type HttpResponse = { status: number; body: unknown };

/**
 * How the refresh token travels (ADR-034).
 * - `token` (mobile): the whole pair in the body and in the store.
 * - `cookie` (web): the refresh token is an httpOnly cookie set by the API. Every request goes
 *   with `credentials: 'include'`, `X-Sobra-Client: web` and `X-CSRF-Token` (double submit, read
 *   from `getCsrfToken`), and the store keeps only the access token.
 */
export type SessionMode =
  | { kind: 'token'; store: TokenStore }
  | {
      kind: 'cookie';
      store: AccessTokenStore;
      getCsrfToken?: (() => string | null) | undefined;
    };

export const CLIENT_HEADER = 'x-sobra-client';
export const CSRF_HEADER = 'x-csrf-token';

export type TransportConfig = {
  baseUrl: string;
  session: SessionMode;
  fetch: FetchFn;
  timeoutMs: number;
  onSessionExpired?: (() => void) | undefined;
  refreshLock?: RefreshLock | undefined;
};

/**
 * Serializes refreshes across JS contexts that share the session (browser tabs share the
 * cookie jar). The web passes `(run) => navigator.locks.request('sobra-refresh', run)`.
 */
export type RefreshLock = (run: () => Promise<boolean>) => Promise<boolean>;

export type Transport = {
  /** Performs the call (with token and one renewal on 401) and returns any 2xx response. */
  send(call: Call): Promise<HttpResponse>;
  /** `send` + validation of the body with the shared output schema. */
  request<S extends z.ZodType>(call: Call, schema: S): Promise<z.output<S>>;
  /** `send` for endpoints that answer 204. */
  requestEmpty(call: Call): Promise<void>;
  /** POSTs to /auth/login or /auth/register and stores the session. */
  startSession(path: string, body: unknown): Promise<User>;
  /** Ends the session on the API (best effort) and always clears the store. */
  endSession(): Promise<void>;
};

export function buildQueryString(query: Readonly<Record<string, QueryValue>> = {}): string {
  const parts = Object.entries(query)
    .filter(
      (entry): entry is [string, string | number | boolean] => entry[1] != null && entry[1] !== '',
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

export function parseWith<S extends z.ZodType>(schema: S, response: HttpResponse): z.output<S> {
  const result = schema.safeParse(response.body);
  if (result.success) return result.data;
  throw new ApiError({
    status: response.status,
    code: CLIENT_ERROR_CODES.invalidResponse,
    message: CLIENT_ERROR_MESSAGES.invalidResponse,
    details: result.error.issues,
  });
}

function parseBody(text: string): { ok: true; value: unknown } | { ok: false } {
  if (text === '') return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

function errorFromResponse(status: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError({ status, code, message, details });
  }
  return new ApiError({ status, code: CLIENT_ERROR_CODES.http, message: httpErrorMessage(status) });
}

export function createTransport(config: TransportConfig): Transport {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const { session } = config;

  /**
   * The access token in use, or `null` when there is no session at all (no Bearer, no renewal).
   * An empty `accessToken` means "renew before calling". In the cookie session an empty store
   * (page reloaded) still has a session behind it while the CSRF cookie exists: the API sets and
   * clears it together with the httpOnly refresh cookie. Without it (never signed in, logged out)
   * there is nothing to renew, so a 401 stays a plain 401 instead of a "session expired".
   */
  async function currentAccessToken(): Promise<string | null> {
    const stored = await session.store.get();
    if (stored) return stored.accessToken;
    return session.kind === 'cookie' && session.getCsrfToken?.() ? '' : null;
  }

  /** What /auth/refresh and /auth/logout receive: the refresh token in the body, or the cookie. */
  async function refreshCredentials(): Promise<{ body: unknown } | null> {
    if (session.kind === 'cookie') return { body: undefined };
    const tokens = await session.store.get();
    return tokens ? { body: { refreshToken: tokens.refreshToken } } : null;
  }

  async function fetchOnce(call: Call, accessToken: string | null): Promise<HttpResponse> {
    if (call.signal?.aborted) throw abortedError();

    const controller = createAbortController();
    let reason: 'timeout' | 'aborted' | null = null;
    const stopTimer = startTimer(() => {
      reason = 'timeout';
      controller.abort();
    }, config.timeoutMs);
    const onCallerAbort = () => {
      reason = 'aborted';
      controller.abort();
    };
    call.signal?.addEventListener('abort', onCallerAbort);

    const headers: Record<string, string> = { accept: 'application/json' };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const init: FetchRequestInit = { method: call.method, headers, signal: controller.signal };
    if (call.body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(call.body);
    }
    if (session.kind === 'cookie') {
      headers[CLIENT_HEADER] = 'web';
      const csrf = session.getCsrfToken?.();
      if (csrf) headers[CSRF_HEADER] = csrf;
      init.credentials = 'include';
    }

    try {
      const response = await config.fetch(
        `${baseUrl}${call.path}${buildQueryString(call.query)}`,
        init,
      );
      const parsed = parseBody(await response.text());
      const ok = response.status >= 200 && response.status < 300;
      if (!parsed.ok) {
        throw ok
          ? new ApiError({
              status: response.status,
              code: CLIENT_ERROR_CODES.invalidResponse,
              message: CLIENT_ERROR_MESSAGES.invalidResponse,
            })
          : errorFromResponse(response.status, undefined);
      }
      return { status: response.status, body: parsed.value };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (reason === 'timeout') {
        throw new ApiError({
          status: 0,
          code: CLIENT_ERROR_CODES.timeout,
          message: CLIENT_ERROR_MESSAGES.timeout,
          cause: error,
        });
      }
      if (reason === 'aborted') throw abortedError(error);
      throw new ApiError({
        status: 0,
        code: CLIENT_ERROR_CODES.network,
        message: CLIENT_ERROR_MESSAGES.network,
        cause: error,
      });
    } finally {
      stopTimer();
      call.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  async function renew(): Promise<boolean> {
    const credentials = await refreshCredentials();
    if (!credentials) return false;
    // A network failure or timeout propagates and keeps the session: the refresh token may
    // still be valid. Only the API rejecting it (400/401) ends the session; a 403 (CSRF) is
    // not a verdict on the session either.
    const response = await fetchOnce(
      { method: 'POST', path: '/auth/refresh', body: credentials.body },
      null,
    );
    if (response.status === 400 || response.status === 401) {
      await session.store.clear();
      config.onSessionExpired?.();
      return false;
    }
    if (response.status < 200 || response.status >= 300) {
      throw errorFromResponse(response.status, response.body);
    }
    if (session.kind === 'token') await session.store.set(parseWith(tokenPairSchema, response));
    else await session.store.set(parseWith(cookieTokensSchema, response));
    return true;
  }

  let inFlight: Promise<boolean> | null = null;

  /**
   * Single flight: every request that got a 401 waits for the same refresh. A request whose 401
   * arrives after the tokens already changed just retries with the new ones. Two refreshes with
   * the same token would trip the API's reuse detection and revoke the whole session family.
   */
  function refreshSession(staleAccessToken: string): Promise<boolean> {
    const run = async () => {
      // Read inside the lock: another tab may have rotated the session meanwhile.
      const current = await currentAccessToken();
      if (current === null) return false;
      if (current !== staleAccessToken) return true;
      return renew();
    };
    inFlight ??= (config.refreshLock ? config.refreshLock(run) : run()).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function renewOrExpire(staleAccessToken: string): Promise<string | null> {
    if (!(await refreshSession(staleAccessToken))) {
      throw new ApiError({
        status: 401,
        code: CLIENT_ERROR_CODES.sessionExpired,
        message: CLIENT_ERROR_MESSAGES.sessionExpired,
      });
    }
    return currentAccessToken();
  }

  async function send(call: Call): Promise<HttpResponse> {
    const useAuth = call.auth ?? true;
    const stored = useAuth ? await currentAccessToken() : null;
    // No access token yet (a store that kept only the refresh token, or the cookie session
    // after a reload) renews before calling instead of spending a request on a certain 401.
    const renewFirst = stored === '';
    const accessToken = renewFirst ? await renewOrExpire('') : stored;
    let response = await fetchOnce(call, accessToken);

    if (response.status === 401 && stored && !renewFirst) {
      response = await fetchOnce(call, await renewOrExpire(stored));
    }

    if (response.status < 200 || response.status >= 300) {
      throw errorFromResponse(response.status, response.body);
    }
    return response;
  }

  async function startSession(path: string, body: unknown): Promise<User> {
    const response = await send({ method: 'POST', path, body, auth: false });
    if (session.kind === 'token') {
      const { user, tokens } = parseWith(authResponseSchema, response);
      await session.store.set(tokens);
      return user;
    }
    const { user, tokens } = parseWith(cookieAuthResponseSchema, response);
    await session.store.set(tokens);
    return user;
  }

  async function endSession(): Promise<void> {
    try {
      const credentials = await refreshCredentials();
      if (credentials) {
        await send({ method: 'POST', path: '/auth/logout', body: credentials.body, auth: false });
      }
    } catch {
      // Offline or already revoked: the local session goes away regardless.
    } finally {
      await session.store.clear();
    }
  }

  return {
    send,
    request: async (call, schema) => parseWith(schema, await send(call)),
    requestEmpty: async (call) => {
      await send(call);
    },
    startSession,
    endSession,
  };
}

function abortedError(cause?: unknown): ApiError {
  return new ApiError({
    status: 0,
    code: CLIENT_ERROR_CODES.aborted,
    message: CLIENT_ERROR_MESSAGES.aborted,
    cause,
  });
}
