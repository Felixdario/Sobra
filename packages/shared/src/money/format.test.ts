import { describe, expect, it } from 'vitest';
import { cents } from './cents';
import { formatBRL, formatCompactAmount, formatMoney, formatPercent, MINUS_SIGN } from './format';

// Intl separates the symbol from the number (and the number from the compact suffix) with NBSP.
const nbsp = (text: string) => text.replaceAll(' ', ' ');
const ptBRL = { locale: 'pt-BR', currency: 'BRL' } as const;

describe('formatMoney', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [123_456, 'R$ 1.234,56'],
    [-550, '−R$ 5,50'],
    [-5, '−R$ 0,05'],
    [100_000_000_000, 'R$ 1.000.000.000,00'],
    [-100_000_000_000, '−R$ 1.000.000.000,00'],
    [Number.MAX_SAFE_INTEGER, 'R$ 90.071.992.547.409,91'],
  ])('pt-BR + BRL: %d → "%s"', (value, expected) => {
    expect(formatMoney(cents(value), ptBRL)).toBe(nbsp(expected));
  });

  it.each([
    ['en-US', 'USD', 100_000_000_000, '$1,000,000,000.00'],
    ['en-US', 'USD', -550, '−$5.50'],
    ['en-US', 'EUR', 100_000_000_000, '€1,000,000,000.00'],
    ['en-US', 'BRL', 123_456, 'R$1,234.56'],
    ['pt-BR', 'EUR', 100_000_000_000, '€ 1.000.000.000,00'],
    ['pt-BR', 'USD', -123_456, '−US$ 1.234,56'],
  ] as const)(
    '%s + %s: %d → "%s" (segue o Intl de cada locale)',
    (locale, currency, value, out) => {
      expect(formatMoney(cents(value), { locale, currency })).toBe(nbsp(out));
    },
  );

  it('usa U+2212, nunca o hífen, no sinal negativo', () => {
    const text = formatMoney(cents(-1), { locale: 'en-US', currency: 'USD' });
    expect(text.startsWith(MINUS_SIGN)).toBe(true);
    expect(text).not.toContain('-');
  });

  it('mostra o sinal explícito com signed (zero sem sinal)', () => {
    expect(formatMoney(cents(1000), { ...ptBRL, signed: true })).toBe(nbsp('+R$ 10,00'));
    expect(formatMoney(cents(-1000), { ...ptBRL, signed: true })).toBe(nbsp('−R$ 10,00'));
    expect(formatMoney(cents(0), { ...ptBRL, signed: true })).toBe(nbsp('R$ 0,00'));
    const usd = { locale: 'en-US', currency: 'USD', signed: true } as const;
    expect(formatMoney(cents(1000), usd)).toBe('+$10.00');
    expect(formatMoney(cents(-1000), usd)).toBe('−$10.00');
  });

  it('usa notação compacta com compact', () => {
    const compact = { ...ptBRL, compact: true };
    expect(formatMoney(cents(123_456_789), compact)).toBe(nbsp('R$ 1,2 mi'));
    expect(formatMoney(cents(35_000_000), compact)).toBe(nbsp('R$ 350 mil'));
    expect(formatMoney(cents(100_000_000_000), compact)).toBe(nbsp('R$ 1 bi'));
    expect(formatMoney(cents(1234), compact)).toBe(nbsp('R$ 12,3'));
    expect(formatMoney(cents(-150_000), compact)).toBe(nbsp('−R$ 1,5 mil'));
    expect(formatMoney(cents(150_000), { ...compact, signed: true })).toBe(nbsp('+R$ 1,5 mil'));
    const usd = { locale: 'en-US', currency: 'USD', compact: true } as const;
    expect(formatMoney(cents(123_456_789), usd)).toBe('$1.2M');
    expect(formatMoney(cents(100_000_000_000), usd)).toBe('$1B');
    expect(formatMoney(cents(-35_000_000), { ...usd, currency: 'EUR' })).toBe('−€350K');
  });

  it('rejeita valores que não são centavos inteiros', () => {
    expect(() => formatMoney(1.5 as never, ptBRL)).toThrow(RangeError);
  });
});

describe('formatBRL', () => {
  it('é o atalho pt-BR + BRL de formatMoney', () => {
    expect(formatBRL(cents(-123_456))).toBe(nbsp('−R$ 1.234,56'));
    expect(formatBRL(cents(150_000), { compact: true, signed: true })).toBe(nbsp('+R$ 1,5 mil'));
  });
});

describe('formatCompactAmount', () => {
  it('compacta sem símbolo, para eixos de gráfico', () => {
    expect(formatCompactAmount(cents(200_000), { locale: 'pt-BR' })).toBe(nbsp('2 mil'));
    expect(formatCompactAmount(cents(1_250_000), { locale: 'pt-BR' })).toBe(nbsp('12,5 mil'));
    expect(formatCompactAmount(cents(-123_456_789), { locale: 'pt-BR' })).toBe(nbsp('−1,2 mi'));
    expect(formatCompactAmount(cents(1_250_000), { locale: 'en-US' })).toBe('12.5K');
    expect(formatCompactAmount(cents(-123_456_789), { locale: 'en-US' })).toBe('−1.2M');
    expect(formatCompactAmount(cents(0), { locale: 'en-US' })).toBe('0');
  });
});

describe('formatPercent', () => {
  it('uma casa, separador do locale e U+2212', () => {
    expect(formatPercent(15, { locale: 'pt-BR' })).toBe('15,0%');
    expect(formatPercent(15, { locale: 'en-US' })).toBe('15.0%');
    expect(formatPercent(-2.16, { locale: 'pt-BR' })).toBe('−2,2%');
    expect(formatPercent(6.8, { locale: 'en-US', signed: true })).toBe('+6.8%');
    expect(formatPercent(0, { locale: 'en-US', signed: true })).toBe('0.0%');
  });
});
