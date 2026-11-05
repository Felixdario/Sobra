import type { KeyValueStore } from './storage';

export type { KeyValueStore } from './storage';

/**
 * Web: expo-secure-store has no browser implementation, so the session lives in localStorage,
 * with an in-memory fallback when storage is blocked (private mode, disabled site data).
 * Same trade-off the web app documents in ADR-023.
 */
const memory = new Map<string, string>();

function local(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const storage: KeyValueStore = {
  async get(key) {
    try {
      return local()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async set(key, value) {
    memory.set(key, value);
    try {
      local()?.setItem(key, value);
    } catch {
      // Quota or blocked storage: the in-memory copy keeps this session working.
    }
  },
  async remove(key) {
    memory.delete(key);
    try {
      local()?.removeItem(key);
    } catch {
      // Nothing to clean up when storage is blocked.
    }
  },
};
