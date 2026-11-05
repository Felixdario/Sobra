import { parseLocalDate, toLocalDateKey } from '@sobra/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOON_MS = 12 * 60 * 60 * 1000;

export function todayKey(now: Date = new Date()): string {
  return toLocalDateKey(now);
}

/** The last `count` days in São Paulo, today first ("YYYY-MM-DD"). Labels: `I18n.dayLabel`. */
export function recentDays(count: number, now: Date = new Date()): string[] {
  const noon = parseLocalDate(todayKey(now)).getTime() + NOON_MS;
  return Array.from({ length: count }, (_, index) =>
    toLocalDateKey(new Date(noon - index * DAY_MS)),
  );
}
