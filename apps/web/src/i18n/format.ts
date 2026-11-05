import { createTranslator } from '@sobra/i18n';
import {
  cents,
  formatCompactAmount,
  formatDate,
  formatMoney,
  formatMoneyInput,
  formatMonth,
  formatPercent,
  MINUS_SIGN,
  parseLocalDate,
  parseMoney,
  TIME_ZONE,
  type Cents,
  type DisplayCurrency,
  type Locale,
  type MonthKey,
} from '@sobra/shared';

const NBSP = ' ';

/** At or above 100 thousand (in the currency) a chart's direct label turns compact. */
const COMPACT_FROM = 10_000_000;

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function createUncached(locale: Locale, currency: DisplayCurrency) {
  const t = createTranslator(locale);
  const money = (value: number) => formatMoney(cents(value), { locale, currency });
  const oneDecimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const counts = new Intl.NumberFormat(locale);
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    timeZone: TIME_ZONE,
  });
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
  const currencySymbol =
    new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency;

  /** Whole units and cents spelled for screen readers: "menos 412 reais e 37 centavos". */
  const spokenMoney = (value: Cents | number): string => {
    const abs = Math.abs(value);
    const major = Math.floor(abs / 100);
    const minor = abs % 100;
    const majorKey = `web.format.spoken.${currency}.major` as 'web.format.spoken.BRL.major';
    const minorKey = `web.format.spoken.${currency}.minor` as 'web.format.spoken.BRL.minor';
    // `amount` without grouping: "1601 reais" reads better aloud than "1.601".
    const majorText =
      major > 0 || minor === 0 ? t(majorKey, { count: major, amount: String(major) }) : null;
    const minorText = minor > 0 ? t(minorKey, { count: minor, amount: String(minor) }) : null;
    const text =
      majorText && minorText
        ? t('web.format.spoken.join', { major: majorText, minor: minorText })
        : (majorText ?? minorText ?? '');
    return value < 0 ? t('web.format.spoken.negative', { amount: text }) : text;
  };

  return {
    locale,
    currency,
    currencySymbol,
    /** "R$ 1.234,56" / "$1,234.56"; negatives with U+2212. */
    money,
    /** "+R$ 6.800,00" / "−$412.37"; zero stays unsigned. */
    signedMoney: (value: number) => formatMoney(cents(value), { locale, currency, signed: true }),
    /**
     * Direct labels on charts (DESIGN.md, "Compacto em gráficos"): exact below 100 thousand, then
     * "R$ 123,5 mil" / "$123.5K", on one line. The exact value stays in the tooltip and table.
     */
    compactMoney: (value: number) =>
      Math.abs(value) < COMPACT_FROM
        ? money(value)
        : formatMoney(cents(value), { locale, currency, compact: true }).replace(/\s/g, NBSP),
    /** Axis labels without the symbol: "12,5 mil" / "12.5K". */
    compactAmount: (value: number) => formatCompactAmount(cents(Math.round(value)), { locale }),
    /** The API's 0–100 scale: 15 → "15,0%" / "15.0%". */
    percent: (value: number) => formatPercent(value, { locale }),
    /** Difference of two rates: "+6,8 p.p." / "+6.8 pp". */
    percentagePoints: (value: number) => {
      const rounded = Math.round(value * 10) / 10;
      const sign = rounded > 0 ? '+' : rounded < 0 ? MINUS_SIGN : '';
      return t('web.format.percentagePoints', {
        value: `${sign}${oneDecimal.format(Math.abs(rounded))}`,
      });
    },
    spokenMoney,
    /** 1284 → "1.284" / "1,284". */
    count: (value: number) => counts.format(value),
    /** "Outubro de 2026" / "October 2026". */
    monthTitle: (key: MonthKey) => capitalize(formatMonth(key, 'long', { locale })),
    /** Mid-sentence: "outubro de 2026" / "October 2026". */
    monthLong: (key: MonthKey) => formatMonth(key, 'long', { locale }),
    /** "outubro" / "October": the base named in comparisons ("vs setembro"). */
    monthName: (key: MonthKey) => formatMonth(key, 'month', { locale }),
    /** Chart axes: "out/26" / "Oct '26". */
    monthShort: (key: MonthKey) => formatMonth(key, 'short', { locale }),
    /** "4 de nov. de 2026" / "Nov 4, 2026". */
    date: (date: Date) => formatDate(date, { locale }),
    /** A calendar day ("2026-10-18") as in a transaction row: "18 out" / "Oct 18". */
    shortDate: (key: string) => {
      const text = shortDate.format(parseLocalDate(key));
      return locale === 'pt-BR' ? text.replace(' de ', ' ').replace('.', '') : text;
    },
    /** "14:05" / "02:05 PM", in São Paulo. */
    time: (instant: number | Date) => time.format(instant),
    /** Prefill of an amount field: 123456 → "1.234,56" / "1,234.56". */
    moneyInput: (value: number) => formatMoneyInput(cents(value), { locale }),
    /** What the person typed in an amount field, in their locale; null when it isn't an amount. */
    parseMoney: (text: string) => parseMoney(text, { locale }),
  };
}

export type Format = ReturnType<typeof createUncached>;

const cache = new Map<string, Format>();

/** Formatters bound to a locale and display currency, created once per pair. */
export function createFormat(locale: Locale, currency: DisplayCurrency): Format {
  const key = `${locale}:${currency}`;
  let format = cache.get(key);
  if (!format) {
    format = createUncached(locale, currency);
    cache.set(key, format);
  }
  return format;
}
