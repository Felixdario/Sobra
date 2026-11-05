import { createApiClient, type AccessTokenStore, type FetchLike } from '@sobra/client';
import { createMutations, createQueries, shouldRetry } from '@sobra/client/query';
import type { CookieTokens } from '@sobra/shared';
import { QueryClient } from '@tanstack/react-query';

/** Non-httpOnly cookie the API sets with the session: copied into X-CSRF-Token (ADR-034). */
export const CSRF_COOKIE = 'sobra_csrf';
/** Where the refresh token lived before ADR-034; removed on boot for whoever still has it. */
export const LEGACY_REFRESH_KEY = 'sobra.refresh';
export const SESSION_EXPIRED_EVENT = 'session-expired';

/** The page's view of its cookies: only the non-httpOnly ones exist here. */
export type CookieAccess = {
  get(name: string): string | null;
  remove(name: string): void;
};

export const documentCookies: CookieAccess = {
  get(name) {
    for (const part of document.cookie.split(';')) {
      const [key, ...value] = part.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return null;
  },
  remove(name) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`;
  },
};

/**
 * ADR-034: the access token lives only in memory and the refresh token in an httpOnly cookie the
 * page never sees. Clearing the session also drops the CSRF cookie, so a refresh cookie left
 * behind (logout offline) is useless until the next login and the app shows the login screen.
 */
export function createWebTokenStore(cookies: CookieAccess): AccessTokenStore {
  let memory: CookieTokens | null = null;
  return {
    get: async () => memory,
    set: async (tokens) => {
      memory = tokens;
    },
    clear: async () => {
      memory = null;
      cookies.remove(CSRF_COOKIE);
    },
  };
}

type LockManagerLike = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export type ServicesOptions = {
  baseUrl?: string;
  fetch?: FetchLike;
  cookies?: CookieAccess;
  /** Only to drop the pre-ADR-034 refresh token. */
  storage?: Pick<Storage, 'removeItem'>;
  /** Web Locks: one refresh at a time across tabs that share the session cookie. */
  locks?: LockManagerLike | undefined;
  retry?: boolean;
};

function dropLegacyRefreshToken(storage: Pick<Storage, 'removeItem'> | undefined) {
  try {
    (storage ?? window.localStorage).removeItem(LEGACY_REFRESH_KEY);
  } catch {
    // Storage blocked (private window, site data off): there is nothing to remove either.
  }
}

export function createServices(options: ServicesOptions = {}) {
  const cookies = options.cookies ?? documentCookies;
  dropLegacyRefreshToken(options.storage);
  const events = new EventTarget();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: options.retry === false ? false : shouldRetry,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
  const { locks } = options;
  const api = createApiClient({
    baseUrl: options.baseUrl ?? '/api',
    session: 'cookie',
    tokenStore: createWebTokenStore(cookies),
    getCsrfToken: () => cookies.get(CSRF_COOKIE),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(locks ? { refreshLock: (run) => locks.request('sobra-refresh', run) } : {}),
    onSessionExpired: () => {
      queryClient.clear();
      events.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    },
  });
  return {
    api,
    queryClient,
    queries: createQueries(api),
    mutations: createMutations(api),
    events,
    /**
     * The CSRF cookie comes and goes with the httpOnly refresh cookie (same Max-Age, both cleared
     * on logout), so it tells whether a session is worth trying without exposing the token.
     */
    hasStoredSession: () => cookies.get(CSRF_COOKIE) !== null,
  };
}

export type Services = ReturnType<typeof createServices>;
