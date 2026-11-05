import type {
  AccountListParams,
  CategoryListParams,
  SummaryMonthParams,
  SummaryRangeParams,
  TransactionListParams,
} from '../types';

/** Filters of an infinite list: the page number is the page param, not part of the key. */
export type TransactionInfiniteParams = Omit<TransactionListParams, 'page'>;

/**
 * Hierarchical keys: `[domain, kind, params]`. Invalidating `[domain]` reaches every list and
 * detail of that domain; `[domain, 'list']` reaches every filtered list.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => ['accounts', 'list'] as const,
    list: (params: AccountListParams = {}) => ['accounts', 'list', params] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
  categories: {
    all: () => ['categories'] as const,
    lists: () => ['categories', 'list'] as const,
    list: (params: CategoryListParams = {}) => ['categories', 'list', params] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },
  transactions: {
    all: () => ['transactions'] as const,
    lists: () => ['transactions', 'list'] as const,
    list: (params: TransactionListParams = {}) => ['transactions', 'list', params] as const,
    /** Pages loaded on demand (infinite scroll); the data is `InfiniteData<TransactionPage>`. */
    infinites: () => ['transactions', 'infinite'] as const,
    infinite: (params: TransactionInfiniteParams = {}) =>
      ['transactions', 'infinite', params] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
  budgets: {
    all: () => ['budgets'] as const,
    list: (month: string) => ['budgets', 'list', { month }] as const,
  },
  recurring: {
    all: () => ['recurring'] as const,
    list: () => ['recurring', 'list'] as const,
    detail: (id: string) => ['recurring', 'detail', id] as const,
  },
  imports: {
    all: () => ['imports'] as const,
    list: () => ['imports', 'list'] as const,
    detail: (id: string) => ['imports', 'detail', id] as const,
  },
  summary: {
    all: () => ['summary'] as const,
    month: (params: SummaryMonthParams) => ['summary', 'month', params] as const,
    incomeVsExpense: (params: SummaryRangeParams) =>
      ['summary', 'income-vs-expense', params] as const,
    spendingByCategory: (params: SummaryMonthParams) =>
      ['summary', 'spending-by-category', params] as const,
    balanceHistory: (params: SummaryRangeParams) => ['summary', 'balance-history', params] as const,
    budgetVsActual: (month: string) => ['summary', 'budget-vs-actual', { month }] as const,
  },
};

export type QueryDomain =
  | 'me'
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'budgets'
  | 'recurring'
  | 'imports'
  | 'summary';

/** Money moved: balances, totals, budget spending and charts all change. */
const MONEY: readonly QueryDomain[] = ['transactions', 'accounts', 'summary', 'budgets'];

/**
 * What each mutation makes stale (the root key of each domain is invalidated). Kept as data so
 * the rules are reviewable and tested in one place.
 */
export const invalidationMap = {
  'accounts.create': ['accounts', 'summary'],
  // Names are embedded in transactions; balances feed the summary.
  'accounts.update': ['accounts', 'transactions', 'summary'],
  'accounts.remove': ['accounts', 'transactions', 'summary'],
  'categories.create': ['categories'],
  // Name, color and icon are embedded in transactions, spending charts and budgets.
  'categories.update': ['categories', 'transactions', 'summary', 'budgets'],
  'categories.remove': ['categories', 'transactions', 'summary', 'budgets'],
  'transactions.create': MONEY,
  'transactions.update': MONEY,
  'transactions.remove': MONEY,
  'budgets.upsert': ['budgets', 'summary'],
  'budgets.remove': ['budgets', 'summary'],
  'budgets.copy': ['budgets', 'summary'],
  // A rule may be due right away; GET /transactions materializes it.
  'recurring.create': ['recurring', ...MONEY],
  'recurring.update': ['recurring', ...MONEY],
  // Generated transactions are kept when the rule is deleted.
  'recurring.remove': ['recurring'],
  'recurring.sync': ['recurring', ...MONEY],
  'imports.commit': ['imports', ...MONEY],
  'imports.undo': ['imports', ...MONEY],
} as const satisfies Record<string, readonly QueryDomain[]>;

export type InvalidatingMutation = keyof typeof invalidationMap;
