import { type MonthKey, nextMonth, parseMonthKey } from '@sobra/shared';

/** Bounds for `date >= start AND date < end` over "YYYY-MM-DD" strings (ADR-011). */
export function monthDateRange(month: MonthKey): { start: string; end: string } {
  return { start: `${month}-01`, end: `${nextMonth(month)}-01` };
}

/** Months from `from` to `to`, both inclusive, oldest first. */
export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  if (from > to) return [];
  const months: MonthKey[] = [from];
  for (let month = from; month !== to;) {
    month = nextMonth(month);
    months.push(month);
  }
  return months;
}

export function monthCount(from: MonthKey, to: MonthKey): number {
  const start = parseMonthKey(from);
  const end = parseMonthKey(to);
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

/** Calendar days ("YYYY-MM-DD") of a month, in order. */
export function daysOfMonth(month: MonthKey): string[] {
  const { year, month: index } = parseMonthKey(month);
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from({ length: count }, (_, day) => `${month}-${String(day + 1).padStart(2, '0')}`);
}
