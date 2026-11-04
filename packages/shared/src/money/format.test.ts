import { describe, expect, it } from 'vitest';
import { cents } from './cents';
import { formatBRL } from './format';

// Intl separa "R$" do número (e o número do sufixo compacto) com espaço não separável.
const nbsp = (text: string) => text.replaceAll(' ', '\u00a0');

describe('formatBRL', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [123_456, 'R$ 1.234,56'],
    [-550, '-R$ 5,50'],
    [-5, '-R$ 0,05'],
    [100_000_000_000, 'R$ 1.000.000.000,00'],
    [-100_000_000_000, '-R$ 1.000.000.000,00'],
    [Number.MAX_SAFE_INTEGER, 'R$ 90.071.992.547.409,91'],
  ])('%d → "%s"', (value, expected) => {
    expect(formatBRL(cents(value))).toBe(nbsp(expected));
  });

  it('mostra o sinal explícito com signed', () => {
    expect(formatBRL(cents(1000), { signed: true })).toBe(nbsp('+R$ 10,00'));
    expect(formatBRL(cents(-1000), { signed: true })).toBe(nbsp('-R$ 10,00'));
    expect(formatBRL(cents(0), { signed: true })).toBe(nbsp('R$ 0,00'));
  });

  it('usa notação compacta com compact', () => {
    expect(formatBRL(cents(123_456_789), { compact: true })).toBe(nbsp('R$ 1,2 mi'));
    expect(formatBRL(cents(35_000_000), { compact: true })).toBe(nbsp('R$ 350 mil'));
    expect(formatBRL(cents(100_000_000_000), { compact: true })).toBe(nbsp('R$ 1 bi'));
    expect(formatBRL(cents(1234), { compact: true })).toBe(nbsp('R$ 12,3'));
    expect(formatBRL(cents(-150_000), { compact: true })).toBe(nbsp('-R$ 1,5 mil'));
    expect(formatBRL(cents(150_000), { compact: true, signed: true })).toBe(nbsp('+R$ 1,5 mil'));
  });

  it('rejeita valores que não são centavos inteiros', () => {
    expect(() => formatBRL(1.5 as never)).toThrow(RangeError);
  });
});
