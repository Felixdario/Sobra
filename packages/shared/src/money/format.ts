import { DEFAULT_CURRENCY, DEFAULT_LOCALE, type DisplayCurrency, type Locale } from '../config';
import type { Cents } from './cents';
import { splitCents } from './parse';

/** U+2212: DESIGN.md writes every negative amount with the real minus sign, never a hyphen. */
export const MINUS_SIGN = '−';

export interface FormatMoneyOptions {
  locale: Locale;
  currency: DisplayCurrency;
  /** Always show the sign: "+R$ 10,00" / "−R$ 10,00" (zero stays unsigned). */
  signed?: boolean;
  /**
   * Compact notation for charts: "R$ 1,2 mi", "$1.2M". Hermes on iOS does not implement
   * `notation: 'compact'` and prints the full amount instead (see ADR-035).
   */
  compact?: boolean;
}

export type FormatBRLOptions = Pick<FormatMoneyOptions, 'signed' | 'compact'>;

const cache = new Map<string, Intl.NumberFormat>();

function cached(key: string, create: () => Intl.NumberFormat): Intl.NumberFormat {
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = create();
    cache.set(key, formatter);
  }
  return formatter;
}

/** Exact decimal string of a non-negative amount ("1234.56"): no division by 100, no float. */
function toAbsDecimalString(value: Cents): `${number}` {
  const { integerPart, fractionPart } = splitCents(value);
  return `${integerPart}.${fractionPart}` as `${number}`;
}

/**
 * The sign is written by hand in front of Intl's unsigned output, instead of `signDisplay` and
 * Intl's hyphen-minus: Hermes on iOS ignores `signDisplay`, and DESIGN.md wants U+2212. For the
 * supported locales Intl puts the sign before the symbol anyway ("-R$ 5,50", "-$5.50").
 */
function withSign(body: string, value: number, signed: boolean): string {
  if (value < 0) return `${MINUS_SIGN}${body}`;
  return signed && value > 0 ? `+${body}` : body;
}

/**
 * Formats cents in the user's locale and display currency, following each locale's Intl rules:
 * pt-BR+BRL "R$ 1.234,56", en-US+USD "$1,234.56", en-US+EUR "€1,234.56", pt-BR+EUR "€ 1.234,56"
 * (Intl puts a non-breaking space between symbol and number where the locale uses one).
 * Negatives use U+2212 ("−R$ 5,50"). No currency conversion happens: the cents are shown as is.
 */
export function formatMoney(value: Cents, options: FormatMoneyOptions): string {
  const { locale, currency, signed = false, compact = false } = options;
  const formatter = cached(`money:${locale}:${currency}:${compact}`, () =>
    compact
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          notation: 'compact',
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })
      : new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
  );
  return withSign(formatter.format(toAbsDecimalString(value)), value, signed);
}

/** pt-BR + BRL shortcut for code that is not user-facing (seed, logs) and older callers. */
export function formatBRL(value: Cents, options: FormatBRLOptions = {}): string {
  return formatMoney(value, { ...options, locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY });
}

/**
 * Compact amount without the currency symbol, for chart axes: "12,5 mil" / "1,2 mi" in pt-BR,
 * "12.5K" / "1.2M" in en-US. Negatives with U+2212.
 */
export function formatCompactAmount(value: Cents, { locale }: { locale: Locale }): string {
  const formatter = cached(
    `compact:${locale}`,
    () => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }),
  );
  return withSign(formatter.format(toAbsDecimalString(value)), value, false);
}

/**
 * Percent on the contract's 0–100 scale (ADR-019) with one decimal: 15 → "15,0%" (pt-BR) /
 * "15.0%" (en-US). `signed` adds "+" to positives; negatives use U+2212.
 */
export function formatPercent(
  value: number,
  { locale, signed = false }: { locale: Locale; signed?: boolean },
): string {
  const formatter = cached(
    `percent:${locale}`,
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
  );
  const body = formatter.format(Math.abs(value) / 100);
  // A value that rounds to 0,0% gets no sign.
  return /[1-9]/.test(body) ? withSign(body, value, signed) : body;
}
