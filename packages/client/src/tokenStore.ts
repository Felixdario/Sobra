import type { TokenPair } from '@financas/shared';

/**
 * Where the session lives. Async so React Native can back it with expo-secure-store; the web
 * keeps the access token in memory and the refresh token in localStorage (ADR-023).
 * `set` always receives the whole pair: each refresh rotates both tokens.
 * A store that persists only the refresh token returns `accessToken: ''` after a restart; the
 * client then renews the session before the first call.
 */
export type TokenStore = {
  get(): Promise<TokenPair | null>;
  set(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
};

/** In-memory store, for tests and for sessions that must not survive a reload. */
export function createMemoryTokenStore(initial: TokenPair | null = null): TokenStore {
  let tokens = initial;
  return {
    get: async () => tokens,
    set: async (next) => {
      tokens = next;
    },
    clear: async () => {
      tokens = null;
    },
  };
}
