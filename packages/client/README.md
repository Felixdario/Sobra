# @financas/client

Cliente tipado da API do Sobra, o mesmo no web e no mobile. TypeScript puro, sem DOM nem React
Native. Duas entradas:

- `@financas/client`: `createApiClient`, `ApiError` e `TokenStore`. Depende só de `@financas/shared` e `zod`.
- `@financas/client/query`: `queryKeys`, `createQueries`, `createMutations` (invalidações e
  atualização otimista de transações) e `shouldRetry` para TanStack Query v5. Só importa
  `@tanstack/query-core`, e só os tipos dele (peer opcional). `@tanstack/react-query` reexporta
  o query-core, então as opções servem para `useQuery`/`useMutation` direto.

O que o cliente faz em toda chamada:

- manda `Authorization: Bearer`;
- num 401, faz **um** `POST /auth/refresh` (single-flight: as requisições concorrentes esperam o
  mesmo refresh) e repete a chamada uma vez;
- se a API recusar o refresh, chama `tokenStore.clear()` e `onSessionExpired()`;
- valida a resposta com o schema de saída do shared;
- lança `ApiError` (`status`, `code`, `message` pt-BR, `details`) em todo erro: da API, de rede
  (`NETWORK_ERROR`), de timeout (`TIMEOUT`, padrão 15 s), cancelamento (`ABORTED`), resposta
  fora do contrato (`INVALID_RESPONSE`) e sessão expirada (`SESSION_EXPIRED`).

Os motivos estão no ADR-023 (`docs/decisoes.md`).

## Web (React + Vite)

```ts
// src/lib/api.ts
import { createApiClient, type TokenStore } from '@financas/client';
import { createMutations, createQueries, shouldRetry } from '@financas/client/query';
import { QueryClient } from '@tanstack/react-query';

const REFRESH_KEY = 'sobra.refresh';
let memory = { accessToken: '', expiresIn: 0 }; // access token só em memória

const tokenStore: TokenStore = {
  async get() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    // Depois de recarregar, accessToken é '': o cliente renova antes da primeira chamada.
    return refreshToken ? { ...memory, refreshToken } : null;
  },
  async set({ accessToken, expiresIn, refreshToken }) {
    memory = { accessToken, expiresIn };
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  async clear() {
    memory = { accessToken: '', expiresIn: 0 };
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  tokenStore,
  // Abas compartilham o refresh do localStorage: um refresh por vez entre todas elas.
  refreshLock: (run) => navigator.locks.request('sobra-refresh', run),
  onSessionExpired: () => {
    queryClient.clear();
    window.location.assign('/entrar');
  },
});
export const queries = createQueries(api);
export const mutations = createMutations(api);
```

```tsx
const { data } = useQuery(queries.transactions.list({ month: '2026-11', page: 1 }));
// data: Paginated<Transaction> (tipo do shared), erro: ApiError

const remove = useMutation(mutations.transactions.remove); // some da lista na hora
remove.mutate(tx.id, { onError: (error) => toast.error(error.message) });
```

## Mobile (Expo + expo-secure-store)

```ts
import * as SecureStore from 'expo-secure-store';
import { createApiClient, type TokenStore } from '@financas/client';
import { tokenPairSchema } from '@financas/shared';

const KEY = 'sobra.session';
const tokenStore: TokenStore = {
  async get() {
    const raw = await SecureStore.getItemAsync(KEY);
    const parsed = raw ? tokenPairSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : null;
  },
  set: (tokens) => SecureStore.setItemAsync(KEY, JSON.stringify(tokens)),
  clear: () => SecureStore.deleteItemAsync(KEY),
};

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  tokenStore,
  onSessionExpired: () => {
    queryClient.clear();
    router.replace('/entrar');
  },
});
```

`createQueries`/`createMutations` e o resto do código das telas são iguais ao web.

## Regras de uso

- **Callbacks próprios de tela** vão no `mutate(vars, { onSuccess, onError })`. Passar
  `onSuccess`/`onSettled` no `useMutation({ ...mutations.x, onSuccess })` substitui o nosso e
  perde a invalidação (e, nas transações, o rollback).
- **Itens otimistas** têm id `optimistic-N` até a API responder; `isOptimisticId(id)` permite
  desabilitar editar/apagar nesse intervalo. Ao confirmar, o item é trocado pelo real.
- **Lista infinita:** `useInfiniteQuery(queries.transactions.infinite({ month }))` (chave
  `['transactions', 'infinite', params]`, página como `pageParam`). As mutações de transação já
  atualizam essas páginas de forma otimista (criar entra na página certa pela data; editar e
  apagar espelham; rollback em erro), então a tela não precisa de código próprio.
- **Logout:** `mutations.auth.logout` apaga a sessão local mesmo sem rede e limpa o cache.
- **Sessão no boot:** chame `queries.me()`. Se der `SESSION_EXPIRED` ou 401, mostre o login.
- `@tanstack/query-core` precisa ser a mesma versão 5.x que o `@tanstack/react-query` do app
  traz. Com o pnpm isso acontece sozinho quando as faixas são compatíveis.

## Testes

`corepack pnpm --filter @financas/client test`: fetch falso, sem rede. Cobre token,
single-flight, sessão expirada, contrato, erros pt-BR, chaves, invalidações e otimista (listas e páginas infinitas) com
rollback. O teste de integração com a API real fica em `apps/api/src/client.integration.test.ts`
(a API usa este pacote como devDependency, então não há dependência circular).
