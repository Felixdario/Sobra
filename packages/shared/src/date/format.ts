import { DEFAULT_LOCALE, type Locale, TIME_ZONE } from '../config';
import { parseLocalDate, toLocalDateKey } from './day';
import { monthRange, parseMonthKey, type MonthKey } from './month';

export interface DateFormatOptions {
  /** Defaults to `DEFAULT_LOCALE` (pt-BR). */
  locale?: Locale;
}

/** `long`: "novembro de 2026" / "November 2026"; `short`: "nov/26" / "Nov '26"; `month`: "novembro" / "November". */
export type MonthStyle = 'long' | 'short' | 'month';

const RELATIVE_DAY_LABELS: Record<Locale, { today: string; yesterday: string }> = {
  'pt-BR': { today: 'Hoje', yesterday: 'Ontem' },
  'en-US': { today: 'Today', yesterday: 'Yesterday' },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Formatters are cached per locale and options; the zone is always São Paulo (ADR-007). */
function formatter(
  locale: Locale,
  name: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${name}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...options, timeZone: TIME_ZONE });
    formatters.set(key, cached);
  }
  return cached;
}

/** "4 de nov. de 2026" (pt-BR) / "Nov 4, 2026" (en-US), on the São Paulo calendar day. */
export function formatDate(
  date: Date,
  { locale = DEFAULT_LOCALE }: DateFormatOptions = {},
): string {
  return formatter(locale, 'date', { dateStyle: 'medium' }).format(date);
}

/**
 * Month label: "novembro de 2026" / "November 2026" (`long`), "nov/26" / "Nov '26" (`short`, chart
 * axes) or the month name alone, "novembro" / "November" (`month`, comparisons like "vs October").
 */
export function formatMonth(
  key: MonthKey,
  style: MonthStyle = 'long',
  { locale = DEFAULT_LOCALE }: DateFormatOptions = {},
): string {
  const { start } = monthRange(key);
  if (style === 'long') {
    return formatter(locale, 'month-long', { month: 'long', year: 'numeric' }).format(start);
  }
  if (style === 'month') return formatter(locale, 'month-name', { month: 'long' }).format(start);
  // Intl has no "nov/26" form: its short month is "nov." in pt-BR, so the label is built by hand.
  const month = formatter(locale, 'month-short', { month: 'short' }).format(start).replace('.', '');
  const year = String(parseMonthKey(key).year % 100).padStart(2, '0');
  return locale === 'en-US' ? `${month} '${year}` : `${month}/${year}`;
}

export interface RelativeDayOptions extends DateFormatOptions {
  /** Reference instant; defaults to the current time. */
  now?: Date;
}

/**
 * "Hoje" / "Today", "Ontem" / "Yesterday" or the formatted date, comparing calendar days in
 * São Paulo.
 */
export function formatRelativeDay(
  date: Date,
  { locale = DEFAULT_LOCALE, now = new Date() }: RelativeDayOptions = {},
): string {
  const labels = RELATIVE_DAY_LABELS[locale];
  const todayKey = toLocalDateKey(now);
  const dayKey = toLocalDateKey(date);
  if (dayKey === todayKey) return labels.today;
  const yesterdayKey = toLocalDateKey(new Date(parseLocalDate(todayKey).getTime() - 1));
  if (dayKey === yesterdayKey) return labels.yesterday;
  return formatDate(date, { locale });
}
