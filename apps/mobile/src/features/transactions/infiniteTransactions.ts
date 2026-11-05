import type { ApiClient, TransactionListParams, TransactionPage } from '@financas/client';
import { matchesFilters, queryKeys, type ApiMutations } from '@financas/client/query';
import type { Transaction, TransactionCreate } from '@financas/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

/**
 * The list screen pages with `useInfiniteQuery`. Its key lives under the `transactions` root (so
 * every transaction mutation invalidates it) but not under `['transactions', 'list']`, whose
 * entries the client's optimistic helpers expect to be a single page.
 */
export const infiniteKey = (params: TransactionListParams) =>
  [...queryKeys.transactions.all(), 'infinite', params] as const;

type Pages = InfiniteData<TransactionPage, number>;

export function infiniteOptions(api: ApiClient, params: TransactionListParams) {
  return {
    queryKey: infiniteKey(params),
    queryFn: ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) =>
      api.transactions.list({ ...params, page: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last: TransactionPage) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  };
}

function cachedPages(client: QueryClient) {
  return client.getQueriesData<Pages>({ queryKey: [...queryKeys.transactions.all(), 'infinite'] });
}

function findInPages(client: QueryClient, id: string): Transaction | undefined {
  for (const [, data] of cachedPages(client)) {
    for (const page of data?.pages ?? []) {
      const found = page.items.find((item) => item.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

function patchPages(
  client: QueryClient,
  patch: (tx: Transaction, params: TransactionListParams) => Transaction | null,
) {
  for (const [key, data] of cachedPages(client)) {
    if (!data) continue;
    const params = (key[2] ?? {}) as TransactionListParams;
    client.setQueryData<Pages>(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.flatMap((item) => {
          const next = patch(item, params);
          return next ? [next] : [];
        }),
      })),
    });
  }
}

/**
 * The client's optimistic helpers find a transaction in the single-page lists or the detail
 * cache. Seeding the detail from the infinite pages lets them adjust balances, and the edited
 * (or removed) item is then mirrored into the pages. Their snapshot already covers the pages,
 * so a failure rolls everything back.
 */
function seedDetail(client: QueryClient, id: string) {
  const tx = findInPages(client, id);
  if (tx && !client.getQueryData(queryKeys.transactions.detail(id))) {
    client.setQueryData(queryKeys.transactions.detail(id), tx);
  }
}

export function listMutations(mutations: ApiMutations) {
  const { update, remove } = mutations.transactions;
  return {
    update: {
      ...update,
      onMutate: async (
        variables: Parameters<NonNullable<typeof update.onMutate>>[0],
        context: Parameters<NonNullable<typeof update.onMutate>>[1],
      ) => {
        seedDetail(context.client, variables.id);
        const snapshot = await update.onMutate!(variables, context);
        const next = context.client.getQueryData<Transaction>(
          queryKeys.transactions.detail(variables.id),
        );
        if (next) {
          patchPages(context.client, (item, params) =>
            item.id !== variables.id ? item : matchesFilters(next, params) ? next : null,
          );
        }
        return snapshot;
      },
    },
    remove: {
      ...remove,
      onMutate: async (id: string, context: Parameters<NonNullable<typeof remove.onMutate>>[1]) => {
        seedDetail(context.client, id);
        const snapshot = await remove.onMutate!(id, context);
        patchPages(context.client, (item) => (item.id === id ? null : item));
        return snapshot;
      },
    },
  };
}

/** Body that recreates a deleted transaction ("Desfazer"): same fields, new id. */
export function recreateBody(tx: Transaction): TransactionCreate {
  const base = {
    accountId: tx.accountId,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    ...(tx.notes ? { notes: tx.notes } : {}),
  };
  return tx.type === 'transfer'
    ? { ...base, type: 'transfer', toAccountId: tx.toAccountId }
    : { ...base, type: tx.type, categoryId: tx.categoryId };
}
