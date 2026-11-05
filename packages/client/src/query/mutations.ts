import type { MutationOptions, QueryClient } from '@tanstack/query-core';
import type { RecurringSyncResult, Transaction } from '@sobra/shared';
import type { ApiClient } from '../client';
import type { ApiError } from '../errors';
import type {
  AccountUpdateBody,
  CategoryUpdateBody,
  RecurringUpdateBody,
  TransactionCreateBody,
  TransactionUpdateBody,
} from '../types';
import { invalidationMap, queryKeys, type InvalidatingMutation } from './keys';
import {
  confirmCreatedTransaction,
  optimisticCreateTransaction,
  optimisticRemoveTransaction,
  optimisticUpdateTransaction,
  type OptimisticSnapshot,
} from './optimistic';

/** Same shape as TanStack's `mutationOptions(...)`, usable by `useMutation` on web and RN. */
export type ApiMutationOptions<TData, TVariables, TContext = unknown> = Omit<
  MutationOptions<TData, ApiError, TVariables, TContext>,
  '_defaulted'
>;

/** Invalidates the root key of every domain the mutation makes stale. */
export function invalidateAfter(client: QueryClient, mutation: InvalidatingMutation) {
  return Promise.all(
    invalidationMap[mutation].map((domain) => client.invalidateQueries({ queryKey: [domain] })),
  );
}

function mutation<TData, TVariables, TContext = unknown>(
  options: ApiMutationOptions<TData, TVariables, TContext>,
) {
  return options;
}

/** `mutationFn` + invalidation; returning the promise keeps the mutation pending until refetch. */
function invalidating<TData, TVariables>(
  name: InvalidatingMutation,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  return mutation<TData, TVariables>({
    mutationKey: name.split('.'),
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) => invalidateAfter(client, name),
  });
}

type Optimistic = OptimisticSnapshot & { tempId?: string | null };

function rollback(_error: ApiError, _variables: unknown, snapshot: Optimistic | undefined) {
  snapshot?.rollback();
}

/**
 * Mutation options for every write endpoint, with the right invalidations. Callbacks receive the
 * QueryClient from TanStack (v5 `MutationFunctionContext`), so no client is passed here.
 * To add screen behavior without losing ours, use the per-call callbacks:
 * `mutate(vars, { onSuccess })`.
 */
export function createMutations(api: ApiClient) {
  return {
    auth: {
      login: mutation({
        mutationKey: ['auth', 'login'],
        mutationFn: api.auth.login,
        onSuccess: (user, _variables, _result, { client }) => {
          client.removeQueries();
          client.setQueryData(queryKeys.me(), user);
        },
      }),
      register: mutation({
        mutationKey: ['auth', 'register'],
        mutationFn: api.auth.register,
        onSuccess: (user, _variables, _result, { client }) => {
          client.removeQueries();
          client.setQueryData(queryKeys.me(), user);
        },
      }),
      /** Always ends the local session; the cache of the previous user is dropped. */
      logout: mutation<void, void>({
        mutationKey: ['auth', 'logout'],
        mutationFn: () => api.auth.logout(),
        onSettled: (_data, _error, _variables, _result, { client }) => {
          client.removeQueries();
        },
      }),
    },

    accounts: {
      create: invalidating('accounts.create', api.accounts.create),
      update: invalidating('accounts.update', (v: { id: string; body: AccountUpdateBody }) =>
        api.accounts.update(v.id, v.body),
      ),
      remove: invalidating('accounts.remove', api.accounts.remove),
    },

    categories: {
      create: invalidating('categories.create', api.categories.create),
      update: invalidating('categories.update', (v: { id: string; body: CategoryUpdateBody }) =>
        api.categories.update(v.id, v.body),
      ),
      remove: invalidating('categories.remove', api.categories.remove),
    },

    transactions: {
      /** Appears in the lists (and moves the balance) before the API answers. */
      create: mutation<Transaction, TransactionCreateBody, Optimistic>({
        mutationKey: ['transactions', 'create'],
        mutationFn: api.transactions.create,
        onMutate: (body, { client }) => optimisticCreateTransaction(client, body),
        onError: rollback,
        onSuccess: (tx, _body, snapshot, { client }) => {
          if (snapshot.tempId) confirmCreatedTransaction(client, snapshot.tempId, tx);
        },
        onSettled: (_data, _error, _body, _snapshot, { client }) =>
          invalidateAfter(client, 'transactions.create'),
      }),
      update: mutation<Transaction, { id: string; body: TransactionUpdateBody }, Optimistic>({
        mutationKey: ['transactions', 'update'],
        mutationFn: ({ id, body }) => api.transactions.update(id, body),
        onMutate: ({ id, body }, { client }) => optimisticUpdateTransaction(client, id, body),
        onError: rollback,
        onSettled: (_data, _error, _variables, _snapshot, { client }) =>
          invalidateAfter(client, 'transactions.update'),
      }),
      /** Disappears from the lists before the API answers; comes back if it fails. */
      remove: mutation<void, string, Optimistic>({
        mutationKey: ['transactions', 'remove'],
        mutationFn: api.transactions.remove,
        onMutate: (id, { client }) => optimisticRemoveTransaction(client, id),
        onError: rollback,
        onSettled: (_data, _error, _id, _snapshot, { client }) =>
          invalidateAfter(client, 'transactions.remove'),
      }),
    },

    budgets: {
      upsert: invalidating('budgets.upsert', api.budgets.upsert),
      remove: invalidating('budgets.remove', api.budgets.remove),
      copy: invalidating('budgets.copy', api.budgets.copy),
    },

    recurring: {
      create: invalidating('recurring.create', api.recurring.create),
      update: invalidating('recurring.update', (v: { id: string; body: RecurringUpdateBody }) =>
        api.recurring.update(v.id, v.body),
      ),
      remove: invalidating('recurring.remove', api.recurring.remove),
      sync: invalidating<RecurringSyncResult, void>('recurring.sync', () => api.recurring.sync()),
    },

    imports: {
      /** Read-only on the server: no invalidation. */
      preview: mutation({ mutationKey: ['imports', 'preview'], mutationFn: api.imports.preview }),
      commit: invalidating('imports.commit', api.imports.commit),
      undo: invalidating('imports.undo', api.imports.undo),
    },
  };
}

export type ApiMutations = ReturnType<typeof createMutations>;
