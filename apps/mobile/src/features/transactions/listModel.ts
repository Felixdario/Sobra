import type { TransactionListParams } from '@financas/client';
import { cents, type Cents, type MonthKey, type Transaction } from '@financas/shared';
import { dayLabel } from '../launch/dates';

export type ListRow =
  | { kind: 'day'; key: string; date: string; label: string; total: Cents }
  | { kind: 'tx'; key: string; tx: Transaction };

/** Effect of a transaction on "how much is left": income +, expense −, transfers neutral (ADR-015). */
export function netOf(tx: Transaction): number {
  if (tx.type === 'income') return tx.amount;
  if (tx.type === 'expense') return -tx.amount;
  return 0;
}

/**
 * Rows for the list: a header per day ("Hoje", "Ontem", "seg., 2 de nov.") with the day's net,
 * then the day's transactions in the API order (newest first). Totals cover the loaded pages.
 */
export function groupByDay(items: readonly Transaction[], now: Date = new Date()): ListRow[] {
  const rows: ListRow[] = [];
  const totals = new Map<string, number>();
  for (const tx of items) {
    if (!totals.has(tx.date)) {
      totals.set(tx.date, 0);
      rows.push({
        kind: 'day',
        key: `day-${tx.date}`,
        date: tx.date,
        label: dayLabel(tx.date, now),
        total: cents(0),
      });
    }
    totals.set(tx.date, (totals.get(tx.date) ?? 0) + netOf(tx));
    rows.push({ kind: 'tx', key: tx.id, tx });
  }
  return rows.map((row) =>
    row.kind === 'day' ? { ...row, total: cents(totals.get(row.date) ?? 0) } : row,
  );
}

export type Filters = {
  month?: MonthKey | undefined;
  accountId?: string | undefined;
  categoryId?: string | undefined;
  search?: string | undefined;
};

export const PAGE_SIZE = 30;

/** Query params for the API (empty values dropped, so cache keys stay stable). */
export function toParams(filters: Filters): TransactionListParams {
  const params: TransactionListParams = { pageSize: PAGE_SIZE };
  if (filters.month) params.month = filters.month;
  if (filters.accountId) params.accountId = filters.accountId;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  const search = filters.search?.trim();
  if (search) params.search = search;
  return params;
}

export function hasFilters(filters: Filters): boolean {
  return Boolean(
    filters.month || filters.accountId || filters.categoryId || filters.search?.trim(),
  );
}
