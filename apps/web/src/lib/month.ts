import { isMonthKey, monthRange, toLocalDateKey, toMonthKey, type MonthKey } from '@sobra/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

export function currentMonth(now: Date = new Date()): MonthKey {
  return toMonthKey(now);
}

export function parseMonthParam(value: string | null, now: Date = new Date()): MonthKey {
  return value && isMonthKey(value) && value <= currentMonth(now) ? value : currentMonth(now);
}

export function daysInMonth(key: MonthKey): number {
  const { start, end } = monthRange(key);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export type MonthProgress = { partial: false } | { partial: true; day: number; days: number };

/** The current month is partial: "parcial · dia 4 de 30". */
export function monthProgress(key: MonthKey, now: Date = new Date()): MonthProgress {
  if (key !== currentMonth(now)) return { partial: false };
  return {
    partial: true,
    day: Number.parseInt(toLocalDateKey(now).slice(8), 10),
    days: daysInMonth(key),
  };
}
