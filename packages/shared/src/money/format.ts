import { CURRENCY, LOCALE } from '../config';
import type { Cents } from './cents';
import { splitCents } from './parse';

export interface FormatBRLOptions {
  /** Always show the sign: "+R$ 10,00" / "-R$ 10,00" (zero stays unsigned). */
  signed?: boolean;
  /** Compact notation for charts: "R$ 1,2 mi", "R$ 350 mil". */
  compact?: boolean;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter({ signed = false, compact = false }: FormatBRLOptions): Intl.NumberFormat {
  const key = `${signed}:${compact}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      signDisplay: signed ? 'exceptZero' : 'auto',
      ...(compact
        ? { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }
        : {}),
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats cents as BRL: "R$ 1.234,56" (Intl puts a non-breaking space after "R$"). The amount
 * reaches Intl as an exact decimal string, so there is no division by 100 and no float.
 */
export function formatBRL(value: Cents, options: FormatBRLOptions = {}): string {
  const { negative, integerPart, fractionPart } = splitCents(value);
  const decimal = `${negative ? '-' : ''}${integerPart}.${fractionPart}` as `${number}`;
  return getFormatter(options).format(decimal);
}
