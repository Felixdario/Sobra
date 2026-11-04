import { describe, expect, it } from 'vitest';
import { cents } from './cents';
import { centsToReais, parseBRL, reaisToCents, splitCents } from './parse';

describe('parseBRL', () => {
  it.each([
    ['1.234,56', 123_456],
    ['1234,56', 123_456],
    ['R$ 10', 1000],
    ['R$10,00', 1000],
    ['r$ 10', 1000],
    ['10', 1000],
    ['0,05', 5],
    [',5', 50],
    ['10,', 1000],
    ['-5,5', -550],
    ['-R$ 5,50', -550],
    ['R$ -5,50', -550],
    ['\u22125,50', -550],
    ['+5', 500],
    ['  1 234,56 ', 123_456],
    ['1 234 567,89', 123_456_789],
    ['1\u00a0234,56', 123_456],
    ['- R$  5', -500],
    ['R$ - 5', -500],
    ['R$\t10', 1000],
    ['R$\u00a01.234,56', 123_456],
    ['R$\u202f1.234,56', 123_456],
    ['1.000.000.000,00', 100_000_000_000],
    ['R$ 1.000.000.000,00', 100_000_000_000],
    ['0', 0],
    ['-0', 0],
    ['007', 700],
    ['90.071.992.547.409,91', Number.MAX_SAFE_INTEGER],
  ])('"%s" → %d', (input, expected) => {
    const value = parseBRL(input);
    expect(value).toBe(expected);
    expect(Object.is(value, -0)).toBe(false);
  });

  it.each([
    '',
    '   ',
    'R$',
    '-',
    ',',
    'abc',
    '10abc',
    '1,234',
    '0,001',
    '1234.56',
    '1.23',
    '12.34,56',
    '1.2345,00',
    '1,000.00',
    '--5',
    '-R$ -5',
    '+-5',
    '5-',
    'R$ R$ 5',
    '1 2 3',
    '12 34',
    '1 23',
    '1234 567',
    '1.234 567',
    '1 234.567',
    '10 ,50',
    '10, 50',
    '1 234 56',
    '1e5',
    'NaN',
    'Infinity',
    '90.071.992.547.409,92',
  ])('rejeita "%s"', (input) => {
    expect(parseBRL(input)).toBeNull();
  });
});

describe('reaisToCents', () => {
  it('converte ou lança erro', () => {
    expect(reaisToCents('1.234,56')).toBe(123_456);
    expect(() => reaisToCents('1,234')).toThrow(RangeError);
  });
});

describe('centsToReais', () => {
  it.each([
    [123_456, '1.234,56'],
    [0, '0,00'],
    [5, '0,05'],
    [50, '0,50'],
    [100, '1,00'],
    [-550, '-5,50'],
    [100_000_000_000, '1.000.000.000,00'],
    [-100_000_000_000, '-1.000.000.000,00'],
  ])('%d → "%s"', (value, expected) => {
    expect(centsToReais(cents(value))).toBe(expected);
  });

  it('faz ida e volta com parseBRL', () => {
    for (const value of [0, 1, 99, 100, 123_456, -987_654_321, Number.MAX_SAFE_INTEGER]) {
      expect(parseBRL(centsToReais(cents(value)))).toBe(value);
    }
  });
});

describe('splitCents', () => {
  it('separa sinal, inteiros e centavos', () => {
    expect(splitCents(cents(-7))).toEqual({ negative: true, integerPart: '0', fractionPart: '07' });
  });
});
