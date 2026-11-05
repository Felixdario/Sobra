import {
  formatMonth,
  parseMonthKey,
  toLocalDateKey,
  toMonthKey,
  type MonthKey,
} from '@sobra/shared';

export type MonthProgress =
  { kind: 'closed' } | { kind: 'partial'; day: number; daysInMonth: number } | { kind: 'future' };

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Where `key` stands relative to today in São Paulo. */
export function monthProgress(key: MonthKey, now: Date = new Date()): MonthProgress {
  const current = toMonthKey(now);
  if (key < current) return { kind: 'closed' };
  if (key > current) return { kind: 'future' };
  const day = Number.parseInt(toLocalDateKey(now).slice(8, 10), 10);
  return { kind: 'partial', day, daysInMonth: daysInMonth(key) };
}

/** "Outubro de 2026". */
export function monthTitle(key: MonthKey): string {
  const label = formatMonth(key);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "outubro" (no year), for running text. */
export function monthName(key: MonthKey): string {
  return formatMonth(key).split(' de ')[0] ?? formatMonth(key);
}

export function progressLabel(progress: MonthProgress): string {
  switch (progress.kind) {
    case 'closed':
      return 'mês fechado';
    case 'partial':
      return `parcial · dia ${progress.day} de ${progress.daysInMonth}`;
    case 'future':
      return 'mês futuro';
  }
}
