import { parseMonthKey, toLocalDateKey, toMonthKey, type MonthKey } from '@sobra/shared';

export type MonthProgress =
  { kind: 'closed' } | { kind: 'partial'; day: number; daysInMonth: number } | { kind: 'future' };

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Where `key` stands relative to today in São Paulo. Labels: `I18n.progressLabel`. */
export function monthProgress(key: MonthKey, now: Date = new Date()): MonthProgress {
  const current = toMonthKey(now);
  if (key < current) return { kind: 'closed' };
  if (key > current) return { kind: 'future' };
  const day = Number.parseInt(toLocalDateKey(now).slice(8, 10), 10);
  return { kind: 'partial', day, daysInMonth: daysInMonth(key) };
}
