import { describe, expect, it } from 'vitest';
import { cents, isCents } from './cents';

describe('cents', () => {
  it('aceita inteiros seguros, inclusive negativos', () => {
    expect(cents(0)).toBe(0);
    expect(cents(-150)).toBe(-150);
    expect(cents(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejeita %s', (value) => {
    expect(() => cents(value)).toThrow(RangeError);
  });

  it('isCents distingue inteiros seguros de outros valores', () => {
    expect(isCents(100)).toBe(true);
    expect(isCents(0.1)).toBe(false);
    expect(isCents('100')).toBe(false);
  });
});
