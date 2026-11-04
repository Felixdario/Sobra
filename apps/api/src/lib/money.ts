import { type Cents, cents } from '@financas/shared';

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * Money is `BigInt` in the database (ADR-010) and `Cents` (safe integer) everywhere else.
 * Convert only through these helpers.
 */
export const toDbCents = (value: Cents): bigint => BigInt(value);

export function fromDbCents(value: bigint): Cents {
  if (value > MAX_SAFE || value < MIN_SAFE) {
    throw new RangeError(`Valor em centavos fora do inteiro seguro: ${value}`);
  }
  return cents(Number(value));
}

/** `_sum` of an aggregate/groupBy (`null` when there are no rows). */
export const sumOrZero = (value: bigint | null | undefined): bigint => value ?? 0n;
