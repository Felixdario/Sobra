import type { DataTag, QueryFunctionContext, QueryKey } from '@tanstack/query-core';
import type { ApiClient } from '../client';
import type { ApiError } from '../errors';
import type { RequestOptions } from '../http';
import type {
  AccountListParams,
  CategoryListParams,
  SummaryMonthParams,
  SummaryRangeParams,
  TransactionListParams,
} from '../types';
import { queryKeys } from './keys';

/**
 * Same shape as TanStack's `queryOptions(...)`: the key is tagged with the data and error types,
 * so `useQuery`, `queryClient.fetchQuery` and `getQueryData` infer them.
 */
export type ApiQueryOptions<TKey extends QueryKey, TData> = {
  queryKey: DataTag<TKey, TData, ApiError>;
  queryFn: (context: QueryFunctionContext<TKey>) => Promise<TData>;
};

function query<const TKey extends QueryKey, TData>(
  queryKey: TKey,
  fetcher: (opts: RequestOptions) => Promise<TData>,
): ApiQueryOptions<TKey, TData> {
  return {
    queryKey: queryKey as DataTag<TKey, TData, ApiError>,
    queryFn: ({ signal }) => fetcher({ signal }),
  };
}

/** Query options for every read endpoint. Spread them: `useQuery({ ...q.accounts.list(), staleTime })`. */
export function createQueries(api: ApiClient) {
  return {
    me: () => query(queryKeys.me(), (opts) => api.auth.me(opts)),
    accounts: {
      list: (params: AccountListParams = {}) =>
        query(queryKeys.accounts.list(params), (opts) => api.accounts.list(params, opts)),
      detail: (id: string) =>
        query(queryKeys.accounts.detail(id), (opts) => api.accounts.get(id, opts)),
    },
    categories: {
      list: (params: CategoryListParams = {}) =>
        query(queryKeys.categories.list(params), (opts) => api.categories.list(params, opts)),
      detail: (id: string) =>
        query(queryKeys.categories.detail(id), (opts) => api.categories.get(id, opts)),
    },
    transactions: {
      list: (params: TransactionListParams = {}) =>
        query(queryKeys.transactions.list(params), (opts) => api.transactions.list(params, opts)),
      detail: (id: string) =>
        query(queryKeys.transactions.detail(id), (opts) => api.transactions.get(id, opts)),
    },
    budgets: {
      list: (month: string) =>
        query(queryKeys.budgets.list(month), (opts) => api.budgets.list(month, opts)),
    },
    recurring: {
      list: () => query(queryKeys.recurring.list(), (opts) => api.recurring.list(opts)),
      detail: (id: string) =>
        query(queryKeys.recurring.detail(id), (opts) => api.recurring.get(id, opts)),
    },
    imports: {
      list: () => query(queryKeys.imports.list(), (opts) => api.imports.list(opts)),
      detail: (id: string) =>
        query(queryKeys.imports.detail(id), (opts) => api.imports.get(id, opts)),
    },
    summary: {
      month: (params: SummaryMonthParams) =>
        query(queryKeys.summary.month(params), (opts) => api.summary.month(params, opts)),
      incomeVsExpense: (params: SummaryRangeParams) =>
        query(queryKeys.summary.incomeVsExpense(params), (opts) =>
          api.summary.incomeVsExpense(params, opts),
        ),
      spendingByCategory: (params: SummaryMonthParams) =>
        query(queryKeys.summary.spendingByCategory(params), (opts) =>
          api.summary.spendingByCategory(params, opts),
        ),
      balanceHistory: (params: SummaryRangeParams) =>
        query(queryKeys.summary.balanceHistory(params), (opts) =>
          api.summary.balanceHistory(params, opts),
        ),
      budgetVsActual: (month: string) =>
        query(queryKeys.summary.budgetVsActual(month), (opts) =>
          api.summary.budgetVsActual(month, opts),
        ),
    },
  };
}

export type ApiQueries = ReturnType<typeof createQueries>;
