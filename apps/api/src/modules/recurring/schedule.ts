import type { RecurrenceFrequency } from '@sobra/shared';

export type ScheduleRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null | undefined;
  dayOfMonth?: number | null | undefined;
};

type Ymd = { year: number; month: number; day: number };

function parseKey(key: string): Ymd {
  const [year = 0, month = 0, day = 0] = key.split('-').map(Number);
  return { year, month, day };
}

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

function formatKey({ year, month, day }: Ymd): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** Day `day` of the month, or the last day when the month is shorter (31 → 28/02, 29/02 → 28/02). */
function clampedDay(year: number, month: number, day: number): string {
  return formatKey({ year, month, day: Math.min(day, daysInMonth(year, month)) });
}

/**
 * The n-th slot of the rule (n ≥ 0), always computed from the start so a short month never
 * shifts the following ones (31/01 → 28/02 → 31/03). Monthly slots may fall before `startDate`
 * when `dayOfMonth` is earlier than the start day; callers filter them out.
 */
function slot(rule: ScheduleRule, n: number): string {
  const start = parseKey(rule.startDate);
  const day = rule.dayOfMonth ?? start.day;
  const step = n * rule.interval;
  switch (rule.frequency) {
    case 'weekly':
      return addDays(rule.startDate, step * 7);
    case 'monthly': {
      const months = start.month - 1 + step;
      return clampedDay(start.year + Math.floor(months / 12), (months % 12) + 1, day);
    }
    case 'yearly':
      return clampedDay(start.year + step, start.month, day);
  }
}

/** Occurrence dates of `rule` within [from, until] (inclusive, also bounded by start/end dates). */
export function nextOccurrences(rule: ScheduleRule, from: string, until: string): string[] {
  const lower = from > rule.startDate ? from : rule.startDate;
  const upper = rule.endDate && rule.endDate < until ? rule.endDate : until;
  const dates: string[] = [];
  if (lower > upper) return dates;
  for (let n = 0; ; n++) {
    const date = slot(rule, n);
    if (date > upper) return dates;
    if (date >= lower) dates.push(date);
  }
}

/** First occurrence on or after `from`, or `null` when the rule has ended by then. */
export function firstOccurrenceFrom(rule: ScheduleRule, from: string): string | null {
  const lower = from > rule.startDate ? from : rule.startDate;
  for (let n = 0; ; n++) {
    const date = slot(rule, n);
    if (rule.endDate && date > rule.endDate) return null;
    if (date >= lower) return date;
  }
}
