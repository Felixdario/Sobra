# @sobra/client

Cliente tipado da API do Sobra, o mesmo no web e no mobile. TypeScript puro, sem DOM nem React
Native. Duas entradas:

- `@sobra/client`: `createApiClient`, `ApiError`, `TokenStore` e `AccessTokenStore`. Depende só de `@sobra/shared` e `zod`.
- `@sobra/client/query`: `queryKeys`, `createQueries`, `createMutations` (invalidações e
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

## Dois modos de sessão

|                                  | `session: 'token'` (padrão, mobile)                    | `session: 'cookie'` (web)                                                        |
| -------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Refresh token                    | no corpo, guardado no `tokenStore`                     | cookie `httpOnly` `sobra_refresh` (`Path=/auth`), invisível ao JS                |
| `tokenStore`                     | `TokenStore` com o par inteiro (obrigatório)           | `AccessTokenStore`, só o access token (memória por padrão)                       |
| Toda requisição                  | `Authorization: Bearer`                                | `Bearer` + `credentials: 'include'` + `X-Sobra-Client: web` + `X-CSRF-Token`     |
| `/auth/refresh` e `/auth/logout` | `{ refreshToken }` no corpo                            | sem corpo; a API lê o cookie e exige `X-CSRF-Token` igual ao cookie `sobra_csrf` |
| Depois de reiniciar/recarregar   | store com `accessToken: ''` renova antes da 1ª chamada | store vazio + cookie de CSRF presente renova pelo cookie antes da 1ª chamada     |

No modo cookie o pacote não lê `document.cookie` (continua sem DOM): o app injeta
`getCsrfToken`. Store vazio **sem** cookie de CSRF quer dizer "sem sessão": um 401 não dispara
refresh nem `onSessionExpired`. Um 403 no refresh (CSRF) propaga o erro e mantém a sessão.
Motivos no ADR-034.

## Web (React + Vite)

```ts
// src/lib/api.ts (o app real está em apps/web/src/lib/services.ts)
import { createApiClient } from '@sobra/client';
import { createMutations, createQueries, shouldRetry } from '@sobra/client/query';
import { QueryClient } from '@tanstack/react-query';

const readCookie = (name: string) =>
  document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });

export const api = createApiClient({
  baseUrl: '/api', // mesmo site da página (proxy do Vite), senão o cookie vira de terceiro
  session: 'cookie', // refresh em cookie httpOnly; access token só em memória
  getCsrfToken: () => readCookie('sobra_csrf'),
  // As abas compartilham o cookie: um refresh por vez entre todas elas.
  refreshLock: (run) => navigator.locks.request('sobra-refresh', run),
  onSessionExpired: () => {
    queryClient.clear();
    window.location.assign('/entrar');
  },
});
export const queries = createQueries(api);
export const mutations = createMutations(api);

// Há sessão para tentar depois de recarregar? O cookie de CSRF nasce e morre com o de refresh.
export const hasStoredSession = () => readCookie('sobra_csrf') !== null;
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
import { createApiClient, type TokenStore } from '@sobra/client';
import { tokenPairSchema } from '@sobra/shared';

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
- **Logout:** `mutations.auth.logout` chama `POST /auth/logout` (corpo no modo token, cookie + CSRF
  no modo cookie), apaga a sessão local mesmo sem rede e limpa o cache.
- **Sessão no boot:** chame `queries.me()`. Se der `SESSION_EXPIRED` ou 401, mostre o login.
- `@tanstack/query-core` precisa ser a mesma versão 5.x que o `@tanstack/react-query` do app
  traz. Com o pnpm isso acontece sozinho quando as faixas são compatíveis.

## Testes

`corepack pnpm --filter @sobra/client test`: fetch falso, sem rede. Cobre token,
single-flight, sessão expirada, contrato, erros pt-BR, chaves, invalidações e otimista (listas e páginas infinitas) com
rollback. O teste de integração com a API real fica em `apps/api/src/client.integration.test.ts`
(a API usa este pacote como devDependency, então não há dependência circular).
