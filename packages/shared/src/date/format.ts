import { LOCALE, TIME_ZONE } from '../config';
import { parseLocalDate, toLocalDateKey } from './day';
import { monthRange, parseMonthKey, type MonthKey } from './month';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: TIME_ZONE });
const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const shortMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  timeZone: TIME_ZONE,
});

/** "4 de nov. de 2026". */
export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** "novembro de 2026", or "nov/26" with `short` (axis labels). */
export function formatMonth(key: MonthKey, style: 'long' | 'short' = 'long'): string {
  const { start } = monthRange(key);
  if (style === 'long') return monthFormatter.format(start);
  // Intl's short month is "nov." and its month+year form is "nov. de 2026"; charts want "nov/26".
  const month = shortMonthFormatter.format(start).replace('.', '');
  const year = String(parseMonthKey(key).year % 100).padStart(2, '0');
  return `${month}/${year}`;
}

/** "Hoje", "Ontem" or the formatted date, comparing calendar days in São Paulo. */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  const todayKey = toLocalDateKey(now);
  const dayKey = toLocalDateKey(date);
  if (dayKey === todayKey) return 'Hoje';
  const yesterdayKey = toLocalDateKey(new Date(parseLocalDate(todayKey).getTime() - 1));
  if (dayKey === yesterdayKey) return 'Ontem';
  return formatDate(date);
}
