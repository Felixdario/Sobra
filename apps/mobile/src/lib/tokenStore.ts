import type { TokenStore } from '@sobra/client';
import { tokenPairSchema } from '@sobra/shared';
import type { KeyValueStore } from './storage';

export const SESSION_KEY = 'sobra.session';

function parse(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = tokenPairSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The whole token pair, serialized under one key (ADR-023). A corrupt value reads as signed out. */
export function createTokenStore(store: KeyValueStore): TokenStore {
  return {
    get: async () => parse(await store.get(SESSION_KEY)),
    set: (tokens) => store.set(SESSION_KEY, JSON.stringify(tokens)),
    clear: () => store.remove(SESSION_KEY),
  };
}
