import {
  accountSchema,
  budgetSchema,
  categorySchema,
  csvImportCommitResultSchema,
  csvImportPreviewSchema,
  importBatchSchema,
  recurringSchema,
  recurringSyncResultSchema,
  userSchema,
  balanceHistorySchema,
  budgetVsActualSchema,
  incomeVsExpenseSeriesSchema,
  monthSummarySchema,
  spendingByCategorySchema,
  transactionSchema,
  type Account,
} from '@sobra/shared';
import { z } from 'zod';
import {
  createTransport,
  DEFAULT_TIMEOUT_MS,
  parseWith,
  type RefreshLock,
  type RequestOptions,
  type SessionMode,
} from './http';
import { asFetchFn, defaultFetch, type FetchLike } from './runtime';
import { type AccessTokenStore, createMemoryTokenStore, type TokenStore } from './tokenStore';
import {
  transactionPageSchema,
  type AccountCreateBody,
  type AccountListParams,
  type AccountRemoval,
  type AccountUpdateBody,
  type BudgetCopyBody,
  type BudgetUpsertBody,
  type CategoryCreateBody,
  type CategoryListParams,
  type CategoryUpdateBody,
  type ImportCommitBody,
  type ImportPreviewBody,
  type LoginBody,
  type RecurringCreateBody,
  type RecurringUpdateBody,
  type RegisterBody,
  type PreferencesUpdateBody,
  type SummaryMonthParams,
  type SummaryRangeParams,
  type TransactionCreateBody,
  type TransactionListParams,
  type TransactionUpdateBody,
} from './types';

/** Mobile: the whole token pair travels in the body and lives in `tokenStore`. */
export type TokenSessionConfig = {
  session?: 'token';
  tokenStore: TokenStore;
};

/**
 * Web (ADR-034): the refresh token is an httpOnly cookie the API sets and JavaScript never sees.
 * Requests go with `credentials: 'include'` and `X-Sobra-Client: web`; `getCsrfToken` returns the
 * value of the `sobra_csrf` cookie, sent as `X-CSRF-Token` (the package does not touch the DOM).
 */
export type CookieSessionConfig = {
  session: 'cookie';
  /** Keeps only the access token. Defaults to memory, which is what the web wants. */
  tokenStore?: AccessTokenStore;
  getCsrfToken?: () => string | null;
};

export type ApiClientConfig = (TokenSessionConfig | CookieSessionConfig) & {
  /** API origin, e.g. `http://localhost:3333`. */
  baseUrl: string;
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Per-attempt timeout in ms (default 15 s). */
  timeoutMs?: number;
  /**
   * Called once when the API rejects the refresh token (the store was already cleared).
   * Apps clear the query cache and go to the login screen here.
   */
  onSessionExpired?: () => void;
  /**
   * Cross-tab lock around the refresh (web): tabs share the session cookie but each has its own
   * in-memory single flight: `(run) => navigator.locks.request('sobra-refresh', run)`.
   */
  refreshLock?: RefreshLock;
};

const byId = (base: string, id: string) => `${base}/${encodeURIComponent(id)}`;

function sessionMode(config: ApiClientConfig): SessionMode {
  if (config.session === 'cookie') {
    return {
      kind: 'cookie',
      store: config.tokenStore ?? createMemoryTokenStore(),
      getCsrfToken: config.getCsrfToken,
    };
  }
  return { kind: 'token', store: config.tokenStore };
}

export function createApiClient(config: ApiClientConfig) {
  const http = createTransport({
    baseUrl: config.baseUrl,
    session: sessionMode(config),
    fetch: config.fetch ? asFetchFn(config.fetch) : defaultFetch(),
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    onSessionExpired: config.onSessionExpired,
    refreshLock: config.refreshLock,
  });
  const list = <S extends z.ZodType>(item: S) => z.array(item);

  return {
    auth: {
      /** Creates the user and stores the session. */
      register: (body: RegisterBody) => http.startSession('/auth/register', body),
      /** Signs in and stores the session. A wrong password is an `ApiError` 401. */
      login: (body: LoginBody) => http.startSession('/auth/login', body),
      /**
       * Ends the session on the API (best effort) and always clears the local store.
       * Does not call `onSessionExpired`.
       */
      logout: (): Promise<void> => http.endSession(),
      me: (opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: '/me', ...opts }, userSchema),
      /**
       * Saves the interface language and/or display currency (ADR-035) and returns the updated
       * user. The currency only changes formatting: amounts are never converted.
       */
      updatePreferences: (body: PreferencesUpdateBody) =>
        http.request({ method: 'PATCH', path: '/me/preferences', body }, userSchema),
    },

    accounts: {
      list: (params: AccountListParams = {}, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/accounts', query: params, ...opts },
          list(accountSchema),
        ),
      get: (id: string, opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: byId('/accounts', id), ...opts }, accountSchema),
      create: (body: AccountCreateBody) =>
        http.request({ method: 'POST', path: '/accounts', body }, accountSchema),
      update: (id: string, body: AccountUpdateBody) =>
        http.request({ method: 'PATCH', path: byId('/accounts', id), body }, accountSchema),
      /** Deletes an account without transactions; one with transactions is archived instead. */
      remove: async (id: string): Promise<AccountRemoval> => {
        const response = await http.send({ method: 'DELETE', path: byId('/accounts', id) });
        if (response.status === 204) return { status: 'deleted' };
        const account: Account = parseWith(accountSchema, response);
        return { status: 'archived', account };
      },
    },

    categories: {
      list: (params: CategoryListParams = {}, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/categories', query: params, ...opts },
          list(categorySchema),
        ),
      get: (id: string, opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: byId('/categories', id), ...opts }, categorySchema),
      create: (body: CategoryCreateBody) =>
        http.request({ method: 'POST', path: '/categories', body }, categorySchema),
      update: (id: string, body: CategoryUpdateBody) =>
        http.request({ method: 'PATCH', path: byId('/categories', id), body }, categorySchema),
      remove: (id: string) =>
        http.requestEmpty({ method: 'DELETE', path: byId('/categories', id) }),
    },

    transactions: {
      list: (params: TransactionListParams = {}, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/transactions', query: params, ...opts },
          transactionPageSchema,
        ),
      get: (id: string, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: byId('/transactions', id), ...opts },
          transactionSchema,
        ),
      create: (body: TransactionCreateBody) =>
        http.request({ method: 'POST', path: '/transactions', body }, transactionSchema),
      update: (id: string, body: TransactionUpdateBody) =>
        http.request({ method: 'PATCH', path: byId('/transactions', id), body }, transactionSchema),
      remove: (id: string) =>
        http.requestEmpty({ method: 'DELETE', path: byId('/transactions', id) }),
    },

    budgets: {
      list: (month: string, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/budgets', query: { month }, ...opts },
          list(budgetSchema),
        ),
      /** Creates or replaces the budget of a category in a month. */
      upsert: (body: BudgetUpsertBody) =>
        http.request({ method: 'PUT', path: '/budgets', body }, budgetSchema),
      remove: (id: string) => http.requestEmpty({ method: 'DELETE', path: byId('/budgets', id) }),
      /** Copies `from` into `to` (keeps what `to` has) and returns all budgets of `to`. */
      copy: (body: BudgetCopyBody) =>
        http.request({ method: 'POST', path: '/budgets/copy', body }, list(budgetSchema)),
    },

    recurring: {
      list: (opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: '/recurring', ...opts }, list(recurringSchema)),
      get: (id: string, opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: byId('/recurring', id), ...opts }, recurringSchema),
      create: (body: RecurringCreateBody) =>
        http.request({ method: 'POST', path: '/recurring', body }, recurringSchema),
      update: (id: string, body: RecurringUpdateBody) =>
        http.request({ method: 'PATCH', path: byId('/recurring', id), body }, recurringSchema),
      remove: (id: string) => http.requestEmpty({ method: 'DELETE', path: byId('/recurring', id) }),
      /** Generates the occurrences due up to today (idempotent). */
      sync: () =>
        http.request({ method: 'POST', path: '/recurring/sync' }, recurringSyncResultSchema),
    },

    imports: {
      /** Validates a CSV (text or rows) without saving anything. */
      preview: (body: ImportPreviewBody) =>
        http.request(
          { method: 'POST', path: '/imports/csv/preview', body },
          csvImportPreviewSchema,
        ),
      /** Imports the reviewed rows, all or nothing. */
      commit: (body: ImportCommitBody) =>
        http.request(
          { method: 'POST', path: '/imports/csv/commit', body },
          csvImportCommitResultSchema,
        ),
      list: (opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: '/imports', ...opts }, list(importBatchSchema)),
      get: (id: string, opts: RequestOptions = {}) =>
        http.request({ method: 'GET', path: byId('/imports', id), ...opts }, importBatchSchema),
      /** Deletes the batch and the transactions it created. */
      undo: (id: string) => http.requestEmpty({ method: 'DELETE', path: byId('/imports', id) }),
    },

    summary: {
      month: (params: SummaryMonthParams, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/summary/month', query: params, ...opts },
          monthSummarySchema,
        ),
      incomeVsExpense: (params: SummaryRangeParams, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/summary/income-vs-expense', query: params, ...opts },
          incomeVsExpenseSeriesSchema,
        ),
      spendingByCategory: (params: SummaryMonthParams, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/summary/spending-by-category', query: params, ...opts },
          spendingByCategorySchema,
        ),
      balanceHistory: (params: SummaryRangeParams, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/summary/balance-history', query: params, ...opts },
          balanceHistorySchema,
        ),
      budgetVsActual: (month: string, opts: RequestOptions = {}) =>
        http.request(
          { method: 'GET', path: '/summary/budget-vs-actual', query: { month }, ...opts },
          budgetVsActualSchema,
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
