import { categoryName, createTranslator, type Translator } from '@sobra/i18n';
import {
  formatMoney,
  formatMonth,
  formatPercent,
  formatRelativeDay,
  parseLocalDate,
  TIME_ZONE,
  toLocalDateKey,
  type CategorySystemKey,
  type Cents,
  type DisplayCurrency,
  type Locale,
  type MonthKey,
} from '@sobra/shared';
import type { MonthProgress } from '../lib/month';

/** `never` drops the sign, for amounts whose direction the label already says. */
export type SignMode = 'auto' | 'always' | 'never';

/**
 * Everything a screen needs to speak the user's language and currency: the translator plus the
 * formatters bound to the preference. Pure (no React), so models and tests use it directly.
 */
export type I18n = {
  locale: Locale;
  currency: DisplayCurrency;
  t: Translator;
  /** "+R$ 6.800,00", "−$412.37" (U+2212), zero unsigned. */
  money: (value: Cents, sign?: SignMode) => string;
  /** Screen reader text: "menos 412 reais e 37 centavos", "minus 412 dollars and 37 cents". */
  speakMoney: (value: Cents) => string;
  /** Contract percentages are on the 0–100 scale (ADR-019): 15 → "15,0%" / "15.0%". */
  percent: (value: number) => string;
  /** "Outubro de 2026" / "October 2026". */
  monthTitle: (key: MonthKey) => string;
  /** "outubro" / "October", for running text. */
  monthName: (key: MonthKey) => string;
  progressLabel: (progress: MonthProgress) => string;
  /** "Hoje", "Ontem" or "seg., 2 de nov." / "Today", "Yesterday" or "Mon, Nov 2". */
  dayLabel: (key: string, now?: Date) => string;
  /** "14:05" / "2:05 PM", in São Paulo. */
  time: (at: number | Date) => string;
  category: (category: { name: string; systemKey?: CategorySystemKey | null }) => string;
  /** Sorting names the way the language does. */
  compare: (a: string, b: string) => number;
};

const NOON_MS = 12 * 60 * 60 * 1000;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function create(locale: Locale, currency: DisplayCurrency): I18n {
  const t = createTranslator(locale);
  const shortDay = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE,
  });
  const clock = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
  const collator = new Intl.Collator(locale);

  const money = (value: Cents, sign: SignMode = 'auto') => {
    const abs = Math.abs(value) as Cents;
    if (sign === 'never') return formatMoney(abs, { locale, currency });
    return formatMoney(value, { locale, currency, signed: sign === 'always' });
  };

  const speakMoney = (value: Cents) => {
    const abs = Math.abs(value);
    const whole = Math.floor(abs / 100);
    const fraction = abs % 100;
    const wholeText = t(`mobile.a11y.money.units.${currency}`, { count: whole });
    const centsText = t('mobile.a11y.money.cents', { count: fraction });
    const amount =
      fraction === 0
        ? wholeText
        : whole === 0
          ? centsText
          : t('mobile.a11y.money.join', { whole: wholeText, cents: centsText });
    return value < 0 ? t('mobile.a11y.money.negative', { amount }) : amount;
  };

  const dayLabel = (key: string, now: Date = new Date()) => {
    const noon = new Date(parseLocalDate(key).getTime() + NOON_MS);
    const today = toLocalDateKey(now);
    const yesterday = toLocalDateKey(new Date(parseLocalDate(today).getTime() - NOON_MS));
    // "Hoje"/"Ontem" come from the shared formatter, so web and mobile say the same words.
    if (key === today || key === yesterday) return formatRelativeDay(noon, { locale, now });
    return shortDay.format(noon);
  };

  return {
    locale,
    currency,
    t,
    money,
    speakMoney,
    percent: (value) => formatPercent(value, { locale }),
    monthTitle: (key) => capitalize(formatMonth(key, 'long', { locale })),
    monthName: (key) => formatMonth(key, 'month', { locale }),
    progressLabel: (progress) => {
      switch (progress.kind) {
        case 'closed':
          return t('mobile.month.closed');
        case 'partial':
          return t('mobile.month.partial', { day: progress.day, total: progress.daysInMonth });
        case 'future':
          return t('mobile.month.future');
      }
    },
    dayLabel,
    time: (at) => clock.format(at),
    category: (category) => categoryName(t, category),
    compare: (a, b) => collator.compare(a, b),
  };
}

const cache = new Map<string, I18n>();

/** One instance per locale and currency, so it is stable across renders. */
export function createI18n(locale: Locale, currency: DisplayCurrency): I18n {
  const key = `${locale}:${currency}`;
  let value = cache.get(key);
  if (!value) {
    value = create(locale, currency);
    cache.set(key, value);
  }
  return value;
}
