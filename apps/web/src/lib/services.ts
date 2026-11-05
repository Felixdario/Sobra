import { createApiClient, type FetchLike, type TokenStore } from '@financas/client';
import { createMutations, createQueries, shouldRetry } from '@financas/client/query';
import { QueryClient } from '@tanstack/react-query';

export const REFRESH_KEY = 'sobra.refresh';
export const SESSION_EXPIRED_EVENT = 'session-expired';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * ADR-023: the access token lives only in memory; the refresh token in localStorage. After a
 * reload `accessToken` is '' and the client renews the session before the first call.
 */
export function createWebTokenStore(storage: KeyValueStorage): TokenStore {
  let memory = { accessToken: '', expiresIn: 0 };
  return {
    async get() {
      const refreshToken = storage.getItem(REFRESH_KEY);
      return refreshToken ? { ...memory, refreshToken } : null;
    },
    async set({ accessToken, expiresIn, refreshToken }) {
      memory = { accessToken, expiresIn };
      storage.setItem(REFRESH_KEY, refreshToken);
    },
    async clear() {
      memory = { accessToken: '', expiresIn: 0 };
      storage.removeItem(REFRESH_KEY);
    },
  };
}

type LockManagerLike = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export type ServicesOptions = {
  baseUrl?: string;
  fetch?: FetchLike;
  storage?: KeyValueStorage;
  /** Web Locks: one refresh at a time across tabs that share the refresh token. */
  locks?: LockManagerLike | undefined;
  retry?: boolean;
};

export function createServices(options: ServicesOptions = {}) {
  const storage = options.storage ?? window.localStorage;
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
    tokenStore: createWebTokenStore(storage),
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
    hasStoredSession: () => storage.getItem(REFRESH_KEY) !== null,
  };
}

export type Services = ReturnType<typeof createServices>;
