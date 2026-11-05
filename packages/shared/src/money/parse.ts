import type { Locale } from '../config';
import { cents, type Cents } from './cents';

const SIGNS = '+\\-−';
// Symbols of the display currencies (ADR-035), before or after the number: "R$ 10", "€ 10", "10 €".
const SYMBOL = '(?:R\\$|US\\$|\\$|€)';

/** Separators as regex fragments. */
type NumberStyle = { decimal: string; group: string };

/**
 * pt-BR: decimal comma; thousands grouped by dot or space ("1.234,56", "1 234,56").
 * en-US: decimal point; thousands grouped by comma ("1,234.56").
 */
const NUMBER_STYLES: Record<Locale, NumberStyle> = {
  'pt-BR': { decimal: ',', group: '[. ]' },
  'en-US': { decimal: '\\.', group: ',' },
};

// Runs on input whose whitespace was collapsed to single spaces. The integer part is plain
// ("1234567") or grouped in thousands by one consistent separator; any other space is only allowed
// between sign, currency symbol and the number.
function amountPattern({ decimal, group }: NumberStyle): RegExp {
  return new RegExp(
    `^(?<signBefore>[${SIGNS}])? ?(?<symbolBefore>${SYMBOL})? ?(?<signAfter>[${SIGNS}])? ?` +
      `(?<integerPart>\\d{1,3}(?<separator>${group})\\d{3}(?:\\k<separator>\\d{3})*|\\d+)?` +
      `(?:${decimal}(?<fractionPart>\\d{0,2}))?(?: ?(?<symbolAfter>${SYMBOL}))?$`,
    'i',
  );
}

const PATTERNS: Record<Locale, RegExp> = {
  'pt-BR': amountPattern(NUMBER_STYLES['pt-BR']),
  'en-US': amountPattern(NUMBER_STYLES['en-US']),
};

/**
 * Parses an amount the way a user of `locale` types it into cents, or `null` for anything else
 * (more than 2 decimals included). Digits are accumulated as integers: no floats.
 * - pt-BR: "1.234,56", "R$ 10", "-5,5", "0,05". "1234.56" is rejected: in pt-BR "1.234" is one
 *   thousand, so a decimal point would make the input ambiguous.
 * - en-US: "1,234.56", "$10", "-5.5", "1234.56". "1.234,56" and "1,23" are rejected.
 * Both accept R$, US$, $ or € before or after the number and the signs -, + and U+2212.
 */
export function parseMoney(input: string, { locale }: { locale: Locale }): Cents | null {
  // \s also matches NBSP and U+202F, which Intl puts after the currency symbol.
  const normalized = input.replace(/\s+/g, ' ').trim();
  const groups = PATTERNS[locale].exec(normalized)?.groups;
  if (!groups) return null;
  const { signBefore, signAfter, symbolBefore, symbolAfter, integerPart, fractionPart } = groups;
  if ((signBefore && signAfter) || (symbolBefore && symbolAfter)) return null;
  if (!integerPart && !fractionPart) return null;
  const digits = (integerPart ?? '').replace(/\D/g, '') + (fractionPart ?? '').padEnd(2, '0');
  let value = 0;
  for (const digit of digits) {
    value = value * 10 + (digit.charCodeAt(0) - 48);
    if (!Number.isSafeInteger(value)) return null;
  }
  const sign = signBefore ?? signAfter;
  const negative = sign === '-' || sign === '−';
  return cents(negative && value !== 0 ? -value : value);
}

/** pt-BR shortcut of {@link parseMoney}: "1.234,56", "R$ 10", "-5,5". */
export function parseBRL(input: string): Cents | null {
  return parseMoney(input, { locale: 'pt-BR' });
}

/** Strict variant of {@link parseBRL} for literals in code, seeds and fixtures. */
export function reaisToCents(reais: string): Cents {
  const value = parseBRL(reais);
  if (value === null) {
    throw new RangeError(`Invalid BRL amount: "${reais}"`);
  }
  return value;
}

/**
 * Amount without the currency symbol, to prefill an input that {@link parseMoney} reads back:
 * 123456 → "1.234,56" (pt-BR) / "1,234.56" (en-US). Negatives use a hyphen, which is what people
 * type in a text field.
 */
export function formatMoneyInput(value: Cents, { locale }: { locale: Locale }): string {
  const { negative, integerPart, fractionPart } = splitCents(value);
  const [group, decimal] = locale === 'en-US' ? [',', '.'] : ['.', ','];
  const grouped = integerPart.replace(/\B(?=(\d{3})+$)/g, group);
  return `${negative ? '-' : ''}${grouped}${decimal}${fractionPart}`;
}

/** pt-BR shortcut of {@link formatMoneyInput}: 123456 → "1.234,56". */
export function centsToReais(value: Cents): string {
  return formatMoneyInput(value, { locale: 'pt-BR' });
}

/** Decimal digits of an amount, taken from its string form so no division by 100 is needed. */
export function splitCents(value: Cents): {
  negative: boolean;
  integerPart: string;
  fractionPart: string;
} {
  const safe = cents(value);
  const digits = String(Math.abs(safe)).padStart(3, '0');
  return {
    negative: safe < 0,
    integerPart: digits.slice(0, -2),
    fractionPart: digits.slice(-2),
  };
}
