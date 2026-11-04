import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { TIME_ZONE } from '../config';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar day the instant falls on in São Paulo, "YYYY-MM-DD". */
export function toLocalDateKey(date: Date): string {
  return format(new TZDate(date, TIME_ZONE), 'yyyy-MM-dd');
}

/** Instant of midnight in São Paulo for a "YYYY-MM-DD" day. Throws on invalid days (2026-02-30). */
export function parseLocalDate(key: string): Date {
  const [, year, month, day] = LOCAL_DATE_PATTERN.exec(key) ?? [];
  if (year !== undefined && month !== undefined && day !== undefined) {
    const start = new Date(
      new TZDate(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
        Number.parseInt(day, 10),
        TIME_ZONE,
      ).getTime(),
    );
    // Date rolls invalid days over (Feb 30 → Mar 2), so a round trip catches them.
    if (toLocalDateKey(start) === key) return start;
  }
  throw new RangeError(`Expected a valid date in the format YYYY-MM-DD, received "${key}"`);
}
