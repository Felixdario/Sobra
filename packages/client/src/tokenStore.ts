import type { CookieTokens, TokenPair } from '@sobra/shared';

/**
 * Where the session lives. Async so React Native can back it with expo-secure-store.
 * `set` always receives what the API returned: each refresh rotates the tokens.
 *
 * - **`session: 'token'`** (mobile): the whole pair (`TokenPair`). A store that persists only
 *   the refresh token returns `accessToken: ''` after a restart; the client then renews the
 *   session before the first call.
 * - **`session: 'cookie'`** (web, ADR-034): only the access token (`AccessTokenStore`); the refresh
 *   token is an httpOnly cookie JavaScript never sees. An empty store with the CSRF cookie present
 *   (page reloaded) makes the client renew through the cookie before the first call.
 */
export type TokenStore<T = TokenPair> = {
  get(): Promise<T | null>;
  set(tokens: T): Promise<void>;
  clear(): Promise<void>;
};

/** Store of the cookie session: the access token and its lifetime, no refresh token. */
export type AccessTokenStore = TokenStore<CookieTokens>;

/** In-memory store, for tests, for the web access token and for sessions that must not survive a reload. */
export function createMemoryTokenStore<T = TokenPair>(initial: T | null = null): TokenStore<T> {
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
