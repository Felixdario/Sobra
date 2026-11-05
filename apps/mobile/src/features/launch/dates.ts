import { parseLocalDate, TIME_ZONE, toLocalDateKey } from '@financas/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOON_MS = 12 * 60 * 60 * 1000;

const shortDay = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});

export function todayKey(now: Date = new Date()): string {
  return toLocalDateKey(now);
}

/** The last `count` days in São Paulo, today first ("YYYY-MM-DD"). */
export function recentDays(count: number, now: Date = new Date()): string[] {
  const noon = parseLocalDate(todayKey(now)).getTime() + NOON_MS;
  return Array.from({ length: count }, (_, index) =>
    toLocalDateKey(new Date(noon - index * DAY_MS)),
  );
}

/** "Hoje", "Ontem" or "seg., 2 de nov.". */
export function dayLabel(key: string, now: Date = new Date()): string {
  const [today, yesterday] = recentDays(2, now);
  if (key === today) return 'Hoje';
  if (key === yesterday) return 'Ontem';
  return shortDay.format(new Date(parseLocalDate(key).getTime() + NOON_MS));
}
