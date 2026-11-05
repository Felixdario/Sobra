import { apiErrorSchema, tokenPairSchema, type TokenPair } from '@sobra/shared';
import type { z } from 'zod';
import { ApiError, CLIENT_ERROR_CODES, CLIENT_ERROR_MESSAGES, httpErrorMessage } from './errors';
import {
  type AbortSignalLike,
  createAbortController,
  type FetchFn,
  type FetchRequestInit,
  startTimer,
} from './runtime';
import type { TokenStore } from './tokenStore';

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

export type TransportConfig = {
  baseUrl: string;
  tokenStore: TokenStore;
  fetch: FetchFn;
  timeoutMs: number;
  onSessionExpired?: (() => void) | undefined;
  refreshLock?: RefreshLock | undefined;
};

/**
 * Serializes refreshes across JS contexts that share the token store (browser tabs). The web
 * passes `(run) => navigator.locks.request('sobra-refresh', run)`.
 */
export type RefreshLock = (run: () => Promise<boolean>) => Promise<boolean>;

export type Transport = {
  /** Performs the call (with token and one renewal on 401) and returns any 2xx response. */
  send(call: Call): Promise<HttpResponse>;
  /** `send` + validation of the body with the shared output schema. */
  request<S extends z.ZodType>(call: Call, schema: S): Promise<z.output<S>>;
  /** `send` for endpoints that answer 204. */
  requestEmpty(call: Call): Promise<void>;
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
  const { tokenStore } = config;

  async function fetchOnce(call: Call, accessToken: string | undefined): Promise<HttpResponse> {
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

  async function renew(refreshToken: string): Promise<boolean> {
    // A network failure or timeout propagates and keeps the session: the refresh token may
    // still be valid. Only the API rejecting it (400/401) ends the session.
    const response = await fetchOnce(
      { method: 'POST', path: '/auth/refresh', body: { refreshToken } },
      undefined,
    );
    if (response.status === 400 || response.status === 401) {
      await tokenStore.clear();
      config.onSessionExpired?.();
      return false;
    }
    if (response.status < 200 || response.status >= 300) {
      throw errorFromResponse(response.status, response.body);
    }
    await tokenStore.set(parseWith(tokenPairSchema, response));
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
      // Read inside the lock: another tab may have rotated the refresh token meanwhile.
      const current = await tokenStore.get();
      if (!current) return false;
      if (current.accessToken !== staleAccessToken) return true;
      return renew(current.refreshToken);
    };
    inFlight ??= (config.refreshLock ? config.refreshLock(run) : run()).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function renewOrExpire(staleAccessToken: string): Promise<string | undefined> {
    if (!(await refreshSession(staleAccessToken))) {
      throw new ApiError({
        status: 401,
        code: CLIENT_ERROR_CODES.sessionExpired,
        message: CLIENT_ERROR_MESSAGES.sessionExpired,
      });
    }
    return (await tokenStore.get())?.accessToken;
  }

  async function send(call: Call): Promise<HttpResponse> {
    const useAuth = call.auth ?? true;
    const tokens: TokenPair | null = useAuth ? await tokenStore.get() : null;
    // A store that kept only the refresh token (`accessToken: ''`, the web after a reload)
    // renews before calling instead of spending a request on a certain 401.
    const renewFirst = tokens !== null && tokens.accessToken === '';
    const accessToken = renewFirst ? await renewOrExpire('') : tokens?.accessToken;
    let response = await fetchOnce(call, accessToken);

    if (response.status === 401 && tokens && !renewFirst) {
      response = await fetchOnce(call, await renewOrExpire(tokens.accessToken));
    }

    if (response.status < 200 || response.status >= 300) {
      throw errorFromResponse(response.status, response.body);
    }
    return response;
  }

  return {
    send,
    request: async (call, schema) => parseWith(schema, await send(call)),
    requestEmpty: async (call) => {
      await send(call);
    },
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
