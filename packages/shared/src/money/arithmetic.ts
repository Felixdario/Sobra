import { cents, type Cents } from './cents';

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label}: expected an integer amount of cents, received ${value}`);
  }
}

/** Keeps `-0` out of results: Intl formats it as "-R$ 0,00". */
function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

export function addCents(a: Cents, b: Cents): Cents {
  assertCents(a, 'addCents');
  assertCents(b, 'addCents');
  return cents(normalizeZero(a + b));
}

export function subtractCents(a: Cents, b: Cents): Cents {
  assertCents(a, 'subtractCents');
  assertCents(b, 'subtractCents');
  return cents(normalizeZero(a - b));
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((total, value) => addCents(total, value), cents(0));
}

export function negate(value: Cents): Cents {
  assertCents(value, 'negate');
  return cents(normalizeZero(-value));
}

export function absCents(value: Cents): Cents {
  assertCents(value, 'absCents');
  return cents(Math.abs(value));
}

/**
 * Splits `total` into `n` equal parts or parts proportional to integer `weights` without losing a
 * cent: largest-remainder method, ties go to the earlier position. 1000 in 3 → [334, 333, 333].
 */
export function allocate(total: Cents, parts: number | readonly number[]): Cents[] {
  assertCents(total, 'allocate');
  const weights = typeof parts === 'number' ? equalWeights(parts) : parts;
  if (weights.length === 0) {
    throw new RangeError('allocate: expected at least one weight');
  }
  for (const weight of weights) {
    if (!Number.isSafeInteger(weight) || weight < 0) {
      throw new RangeError(`allocate: weights must be non-negative integers, received ${weight}`);
    }
  }
  const weightSum = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  if (weightSum === 0n) {
    throw new RangeError('allocate: weights must not all be zero');
  }

  // BigInt because total * weight can exceed Number.MAX_SAFE_INTEGER.
  const magnitude = BigInt(Math.abs(total));
  const shares = weights.map((weight, index) => {
    const product = magnitude * BigInt(weight);
    return { index, share: product / weightSum, remainder: product % weightSum };
  });
  let leftover = magnitude - shares.reduce((sum, { share }) => sum + share, 0n);
  const byRemainder = [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const entry of byRemainder) {
    if (leftover === 0n) break;
    entry.share += 1n;
    leftover -= 1n;
  }

  const sign = total < 0 ? -1 : 1;
  return shares.map(({ share }) => cents(normalizeZero(sign * Number(share))));
}

function equalWeights(n: number): number[] {
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new RangeError(`allocate: expected a positive integer number of parts, received ${n}`);
  }
  return Array.from({ length: n }, () => 1);
}

/**
 * Share of `part` in `total` as a percentage (25 means 25%). Returns `null` when `total` is 0:
 * the ratio is undefined and the UI should show "—" instead of a made-up 0%.
 */
export function percentOf(part: Cents, total: Cents): number | null {
  assertCents(part, 'percentOf');
  assertCents(total, 'percentOf');
  if (total === 0) return null;
  return normalizeZero((part / total) * 100);
}

/**
 * `percent`% of `amount` (12.5 means 12.5%), rounded half-even (ABNT NBR 5891). The percentage is
 * read through its shortest decimal representation, so 0.1 means exactly 1/10 rather than the
 * nearest binary float, and the math runs in BigInt.
 */
export function applyPercent(amount: Cents, percent: number): Cents {
  assertCents(amount, 'applyPercent');
  if (!Number.isFinite(percent)) {
    throw new RangeError(`applyPercent: expected a finite percentage, received ${percent}`);
  }
  const { numerator, scale } = toDecimalFraction(percent);
  const result = divideHalfEven(BigInt(amount) * numerator, 100n * 10n ** scale);
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError('applyPercent: result exceeds the safe integer range');
  }
  return cents(normalizeZero(Number(result)));
}

/** Exact decimal value of a finite number as numerator / 10^scale: 12.5 → 125 / 10^1. */
function toDecimalFraction(value: number): { numerator: bigint; scale: bigint } {
  const [mantissa = '', exponentText = '0'] = String(value).split('e');
  const negative = mantissa.startsWith('-');
  const [integerDigits = '', fractionDigits = ''] = mantissa.replace('-', '').split('.');
  let scale = fractionDigits.length - Number.parseInt(exponentText, 10);
  let digits = BigInt(integerDigits + fractionDigits);
  if (scale < 0) {
    digits *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { numerator: negative ? -digits : digits, scale: BigInt(scale) };
}

function divideHalfEven(dividend: bigint, divisor: bigint): bigint {
  const negative = dividend < 0n;
  const magnitude = negative ? -dividend : dividend;
  let quotient = magnitude / divisor;
  const twiceRemainder = (magnitude % divisor) * 2n;
  if (twiceRemainder > divisor || (twiceRemainder === divisor && quotient % 2n === 1n)) {
    quotient += 1n;
  }
  return negative ? -quotient : quotient;
}
