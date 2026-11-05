import type { TransactionListParams, TransactionSortField } from '@sobra/client';
import {
  isMonthKey,
  PAGE_SIZE_DEFAULT,
  TRANSACTION_TYPES,
  type MonthKey,
  type TransactionType,
} from '@sobra/shared';
import { currentMonth } from '../lib/month';

export type SortDirection = 'asc' | 'desc';
export type Sort = { field: TransactionSortField; direction: SortDirection };

export type ListState = {
  month: MonthKey;
  accountId: string | undefined;
  categoryId: string | undefined;
  type: TransactionType | undefined;
  search: string;
  sort: Sort;
  page: number;
  pageSize: number;
};

export const PAGE_SIZES = [20, 50, 100] as const;
const SORT_FIELDS: readonly TransactionSortField[] = ['date', 'amount', 'description'];
const DEFAULT_SORT: Sort = { field: 'date', direction: 'desc' };

/** URL keys in Portuguese, so a shared link reads as what it shows. */
const KEYS = {
  month: 'mes',
  accountId: 'conta',
  categoryId: 'categoria',
  type: 'tipo',
  search: 'busca',
  sort: 'ordem',
  page: 'pagina',
  pageSize: 'itens',
} as const;

function readSort(value: string | null): Sort {
  const [field, direction] = (value ?? '').split(':');
  if (!SORT_FIELDS.includes(field as TransactionSortField)) return DEFAULT_SORT;
  return {
    field: field as TransactionSortField,
    direction: direction === 'asc' ? 'asc' : 'desc',
  };
}

const positiveInt = (value: string | null, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};

export function readListState(params: URLSearchParams, now: Date = new Date()): ListState {
  const month = params.get(KEYS.month);
  const type = params.get(KEYS.type);
  const pageSize = positiveInt(params.get(KEYS.pageSize), PAGE_SIZE_DEFAULT);
  return {
    month: month && isMonthKey(month) ? month : currentMonth(now),
    accountId: params.get(KEYS.accountId) ?? undefined,
    categoryId: params.get(KEYS.categoryId) ?? undefined,
    type: TRANSACTION_TYPES.includes(type as TransactionType)
      ? (type as TransactionType)
      : undefined,
    search: params.get(KEYS.search) ?? '',
    sort: readSort(params.get(KEYS.sort)),
    page: positiveInt(params.get(KEYS.page), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : PAGE_SIZE_DEFAULT,
  };
}

/** Defaults are left out of the URL. */
export function writeListState(state: ListState, now: Date = new Date()): URLSearchParams {
  const params = new URLSearchParams();
  if (state.month !== currentMonth(now)) params.set(KEYS.month, state.month);
  if (state.accountId) params.set(KEYS.accountId, state.accountId);
  if (state.categoryId) params.set(KEYS.categoryId, state.categoryId);
  if (state.type) params.set(KEYS.type, state.type);
  if (state.search.trim()) params.set(KEYS.search, state.search.trim());
  if (state.sort.field !== DEFAULT_SORT.field || state.sort.direction !== DEFAULT_SORT.direction) {
    params.set(KEYS.sort, `${state.sort.field}:${state.sort.direction}`);
  }
  if (state.page > 1) params.set(KEYS.page, String(state.page));
  if (state.pageSize !== PAGE_SIZE_DEFAULT) params.set(KEYS.pageSize, String(state.pageSize));
  return params;
}

export function toApiParams(state: ListState): TransactionListParams {
  return {
    month: state.month,
    accountId: state.accountId,
    categoryId: state.categoryId,
    type: state.type,
    search: state.search.trim() || undefined,
    sort: `${state.sort.field}:${state.sort.direction}`,
    page: state.page,
    pageSize: state.pageSize,
  };
}

/** Clicking a header: same column flips; a new column starts where people expect it. */
export function nextSort(current: Sort, field: TransactionSortField): Sort {
  if (current.field === field) {
    return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { field, direction: field === 'description' ? 'asc' : 'desc' };
}
