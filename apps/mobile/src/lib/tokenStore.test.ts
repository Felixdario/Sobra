import type { KeyValueStore } from './storage';
import { createTokenStore, SESSION_KEY } from './tokenStore';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      data.set(key, value);
    },
    remove: async (key) => {
      data.delete(key);
    },
  };
}

describe('createTokenStore', () => {
  it('guarda o par inteiro numa chave e lê de volta', async () => {
    const kv = memoryStore();
    const store = createTokenStore(kv);
    const pair = { accessToken: 'a', refreshToken: 'r', expiresIn: 900 };
    await store.set(pair);
    expect(kv.data.has(SESSION_KEY)).toBe(true);
    await expect(store.get()).resolves.toEqual(pair);
    await store.clear();
    await expect(store.get()).resolves.toBeNull();
  });

  it('valor corrompido conta como sem sessão', async () => {
    const kv = memoryStore();
    kv.data.set(SESSION_KEY, '{nao-e-json');
    await expect(createTokenStore(kv).get()).resolves.toBeNull();
  });
});
