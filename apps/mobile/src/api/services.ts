import { createApiClient, type FetchLike, type TokenStore } from '@sobra/client';
import { createMutations, createQueries, shouldRetry } from '@sobra/client/query';
import { QueryClient } from '@tanstack/react-query';

export type ServicesConfig = {
  baseUrl: string;
  tokenStore: TokenStore;
  fetch?: FetchLike;
  /** Tests turn retries off so a failure shows on the first try. */
  retry?: boolean;
};

export const DEFAULT_API_URL = 'http://localhost:3333';

/**
 * Everything the screens use to talk to the API, built once per app (or per test with a fake
 * fetch). `onSessionExpired` fans out to listeners because the client is created before the
 * auth provider that reacts to it.
 */
export function createServices(config: ServicesConfig) {
  const listeners = new Set<() => void>();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: config.retry === false ? false : shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const api = createApiClient({
    baseUrl: config.baseUrl,
    tokenStore: config.tokenStore,
    ...(config.fetch ? { fetch: config.fetch } : {}),
    onSessionExpired: () => {
      queryClient.clear();
      listeners.forEach((listener) => listener());
    },
  });
  return {
    api,
    queries: createQueries(api),
    mutations: createMutations(api),
    queryClient,
    tokenStore: config.tokenStore,
    onSessionExpired(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type Services = ReturnType<typeof createServices>;
