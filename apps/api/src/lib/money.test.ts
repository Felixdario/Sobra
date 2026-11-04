import { describe, expect, it } from 'vitest';
import { cents } from '@financas/shared';
import { fromDbCents, sumOrZero, toDbCents } from './money';

describe('lib/money', () => {
  it('converte Cents ⇄ bigint sem perda até o inteiro seguro', () => {
    expect(toDbCents(cents(100_000_000_000))).toBe(100_000_000_000n);
    expect(fromDbCents(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(fromDbCents(BigInt(Number.MIN_SAFE_INTEGER))).toBe(Number.MIN_SAFE_INTEGER);
  });

  it('lança erro fora do inteiro seguro', () => {
    expect(() => fromDbCents(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
    expect(() => fromDbCents(BigInt(Number.MIN_SAFE_INTEGER) - 1n)).toThrow(RangeError);
  });

  it('trata _sum nulo como zero', () => {
    expect(sumOrZero(null)).toBe(0n);
    expect(sumOrZero(undefined)).toBe(0n);
    expect(sumOrZero(5n)).toBe(5n);
  });
});
