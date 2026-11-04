import { cents, type Cents } from './cents';

const SIGNS = '+\\-\u2212';
// Runs on input whose whitespace was collapsed to single spaces. The integer part is plain
// ("1234567") or grouped in thousands by one consistent separator, dot or space ("1.234.567",
// "1 234 567"); any other space is only allowed between sign, "R$" and the number.
const AMOUNT_PATTERN = new RegExp(
  `^(?<signBefore>[${SIGNS}])? ?(?:R\\$)? ?(?<signAfter>[${SIGNS}])? ?` +
    `(?<integerPart>\\d{1,3}(?<separator>[. ])\\d{3}(?:\\k<separator>\\d{3})*|\\d+)?` +
    `(?:,(?<fractionPart>\\d{0,2}))?$`,
  'i',
);

/**
 * Parses an amount the way a Brazilian user types it ("1.234,56", "R$ 10", "-5,5", "0,05") into
 * cents. Returns `null` for anything else, including more than 2 decimals and the US format
 * "1234.56" (in pt-BR "1.234" is one thousand). Digits are accumulated as integers: no floats.
 */
export function parseBRL(input: string): Cents | null {
  // \s also matches NBSP and U+202F, which Intl puts after "R$".
  const normalized = input.replace(/\s+/g, ' ').trim();
  const groups = AMOUNT_PATTERN.exec(normalized)?.groups;
  if (!groups) return null;
  const { signBefore, signAfter, integerPart, fractionPart } = groups;
  if ((signBefore && signAfter) || (!integerPart && !fractionPart)) {
    return null;
  }

  const digits = (integerPart ?? '').replace(/[. ]/g, '') + (fractionPart ?? '').padEnd(2, '0');
  let value = 0;
  for (const digit of digits) {
    value = value * 10 + (digit.charCodeAt(0) - 48);
    if (!Number.isSafeInteger(value)) return null;
  }

  const sign = signBefore ?? signAfter;
  const negative = sign === '-' || sign === '\u2212';
  return cents(negative && value !== 0 ? -value : value);
}

/** Strict variant of {@link parseBRL} for literals in code, seeds and fixtures. */
export function reaisToCents(reais: string): Cents {
  const value = parseBRL(reais);
  if (value === null) {
    throw new RangeError(`Invalid BRL amount: "${reais}"`);
  }
  return value;
}

/** Amount without the currency symbol, to prefill inputs: 123456 → "1.234,56". */
export function centsToReais(value: Cents): string {
  const { negative, integerPart, fractionPart } = splitCents(value);
  const grouped = integerPart.replace(/\B(?=(\d{3})+$)/g, '.');
  return `${negative ? '-' : ''}${grouped},${fractionPart}`;
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
