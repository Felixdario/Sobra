import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { TIME_ZONE } from '../config';

declare const monthKeyBrand: unique symbol;

/** Calendar month in São Paulo, "YYYY-MM". */
export type MonthKey = string & { readonly [monthKeyBrand]: true };

// Years 1000–9999 only: the Date constructor maps years 0–99 to 1900–1999.
const MONTH_KEY_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === 'string' && MONTH_KEY_PATTERN.test(value);
}

export function monthKey(value: string): MonthKey {
  if (!isMonthKey(value)) {
    throw new RangeError(`Expected a month in the format YYYY-MM, received "${value}"`);
  }
  return value;
}

/** Year and 1-based month of a key. */
export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [year = '', month = ''] = monthKey(key).split('-');
  return { year: Number.parseInt(year, 10), month: Number.parseInt(month, 10) };
}

function fromParts(year: number, month: number): MonthKey {
  const normalizedYear = year + Math.floor((month - 1) / 12);
  const normalizedMonth = ((((month - 1) % 12) + 12) % 12) + 1;
  return monthKey(`${normalizedYear}-${String(normalizedMonth).padStart(2, '0')}`);
}

/** Month the instant falls in, as seen in São Paulo. */
export function toMonthKey(date: Date): MonthKey {
  return monthKey(format(new TZDate(date, TIME_ZONE), 'yyyy-MM'));
}

/**
 * Instants bounding a month in São Paulo: `start` is midnight of day 1, `end` is midnight of day 1
 * of the next month (exclusive), ready for `>= start AND < end` queries.
 */
export function monthRange(key: MonthKey): { start: Date; end: Date } {
  const { year, month } = parseMonthKey(key);
  return {
    start: new Date(new TZDate(year, month - 1, 1, TIME_ZONE).getTime()),
    end: new Date(new TZDate(year, month, 1, TIME_ZONE).getTime()),
  };
}

export function previousMonth(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key);
  return fromParts(year, month - 1);
}

export function nextMonth(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key);
  return fromParts(year, month + 1);
}

/** The `n` months ending at `from` (inclusive), oldest first, as charts expect. */
export function lastNMonths(n: number, from: MonthKey | Date = new Date()): MonthKey[] {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`Expected a non-negative integer number of months, received ${n}`);
  }
  const { year, month } = parseMonthKey(from instanceof Date ? toMonthKey(from) : from);
  return Array.from({ length: n }, (_, index) => fromParts(year, month - (n - 1 - index)));
}
