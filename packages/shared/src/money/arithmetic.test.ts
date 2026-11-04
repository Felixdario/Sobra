import { describe, expect, it } from 'vitest';
import {
  absCents,
  addCents,
  allocate,
  applyPercent,
  negate,
  percentOf,
  subtractCents,
  sumCents,
} from './arithmetic';
import { cents, type Cents } from './cents';

const MAX = cents(Number.MAX_SAFE_INTEGER);
const notCents = 1.5 as Cents;

describe('addCents / subtractCents / sumCents', () => {
  it('somam e subtraem centavos', () => {
    expect(addCents(cents(10), cents(-25))).toBe(-15);
    expect(subtractCents(cents(10), cents(25))).toBe(-15);
    expect(sumCents([cents(10), cents(20), cents(-5)])).toBe(25);
    expect(sumCents([])).toBe(0);
  });

  it('não produzem -0', () => {
    expect(Object.is(addCents(cents(-0), cents(0)), 0)).toBe(true);
    expect(Object.is(subtractCents(cents(-0), cents(0)), 0)).toBe(true);
  });

  it('rejeitam não inteiros e estouro do inteiro seguro', () => {
    expect(() => addCents(notCents, cents(1))).toThrow(RangeError);
    expect(() => addCents(cents(1), notCents)).toThrow(RangeError);
    expect(() => subtractCents(notCents, cents(1))).toThrow(RangeError);
    expect(() => subtractCents(cents(1), notCents)).toThrow(RangeError);
    expect(() => addCents(MAX, cents(1))).toThrow(RangeError);
    expect(() => subtractCents(negate(MAX), cents(2))).toThrow(RangeError);
    expect(() => sumCents([MAX, cents(1)])).toThrow(RangeError);
  });
});

describe('negate / absCents', () => {
  it('invertem o sinal e tiram o módulo', () => {
    expect(negate(cents(150))).toBe(-150);
    expect(negate(cents(-150))).toBe(150);
    expect(Object.is(negate(cents(0)), 0)).toBe(true);
    expect(absCents(cents(-150))).toBe(150);
    expect(absCents(cents(150))).toBe(150);
  });

  it('rejeitam não inteiros', () => {
    expect(() => negate(notCents)).toThrow(RangeError);
    expect(() => absCents(notCents)).toThrow(RangeError);
  });
});

describe('allocate', () => {
  it('reparte em n partes sem perder centavo', () => {
    expect(allocate(cents(1000), 3)).toEqual([334, 333, 333]);
    expect(allocate(cents(5), 3)).toEqual([2, 2, 1]);
    expect(allocate(cents(2), 4)).toEqual([1, 1, 0, 0]);
    expect(allocate(cents(0), 2)).toEqual([0, 0]);
  });

  it('reparte valores negativos espelhando os positivos', () => {
    expect(allocate(cents(-1000), 3)).toEqual([-334, -333, -333]);
    expect(Object.is(allocate(cents(-1), 2)[1], 0)).toBe(true);
  });

  it('reparte por pesos dando a sobra ao maior resto', () => {
    expect(allocate(cents(100), [1, 2])).toEqual([33, 67]);
    expect(allocate(cents(1000), [50, 30, 20])).toEqual([500, 300, 200]);
    expect(allocate(cents(101), [0, 1, 1])).toEqual([0, 51, 50]);
  });

  it('não estoura com total e pesos grandes', () => {
    const parts = allocate(MAX, [3, 7]);
    expect(sumCents(parts)).toBe(MAX);
  });

  it('sempre soma o total', () => {
    for (const total of [1, 7, 99, 100_000_000_000, -12_345]) {
      for (const weights of [[1], [1, 1, 1], [3, 1, 4, 1, 5], [1, 0, 2]]) {
        expect(sumCents(allocate(cents(total), weights))).toBe(total);
      }
    }
  });

  it.each([[0], [-1], [1.5], [[]], [[1, -1]], [[1, 0.5]], [[0, 0]]] as const)(
    'rejeita partes inválidas: %j',
    (parts) => {
      expect(() => allocate(cents(100), parts)).toThrow(RangeError);
    },
  );

  it('rejeita total não inteiro', () => {
    expect(() => allocate(notCents, 2)).toThrow(RangeError);
  });
});

describe('percentOf', () => {
  it('retorna a porcentagem (25 = 25%)', () => {
    expect(percentOf(cents(250), cents(1000))).toBe(25);
    expect(percentOf(cents(-250), cents(1000))).toBe(-25);
    expect(percentOf(cents(1500), cents(1000))).toBe(150);
    expect(Object.is(percentOf(cents(0), cents(-1000)), 0)).toBe(true);
  });

  it('retorna null quando o total é zero', () => {
    expect(percentOf(cents(0), cents(0))).toBeNull();
    expect(percentOf(cents(100), cents(0))).toBeNull();
  });

  it('rejeita não inteiros', () => {
    expect(() => percentOf(notCents, cents(1))).toThrow(RangeError);
    expect(() => percentOf(cents(1), notCents)).toThrow(RangeError);
  });
});

describe('applyPercent', () => {
  it('aplica a porcentagem', () => {
    expect(applyPercent(cents(10_000), 12.5)).toBe(1250);
    expect(applyPercent(cents(10_000), 100)).toBe(10_000);
    expect(applyPercent(cents(10_000), 0)).toBe(0);
    expect(applyPercent(cents(10_000), -10)).toBe(-1000);
    expect(applyPercent(cents(100_000_000_000), 1e2)).toBe(100_000_000_000);
  });

  it('arredonda meio para o par (half-even)', () => {
    expect(applyPercent(cents(5), 50)).toBe(2); // 2,5 → 2
    expect(applyPercent(cents(15), 10)).toBe(2); // 1,5 → 2
    expect(applyPercent(cents(25), 10)).toBe(2); // 2,5 → 2
    expect(applyPercent(cents(35), 10)).toBe(4); // 3,5 → 4
    expect(applyPercent(cents(-25), 10)).toBe(-2);
    expect(applyPercent(cents(-35), 10)).toBe(-4);
    expect(applyPercent(cents(26), 10)).toBe(3); // 2,6 → 3
    expect(applyPercent(cents(24), 10)).toBe(2); // 2,4 → 2
  });

  it('usa o decimal que o número representa, sem erro de float', () => {
    // Em float, 375 * 4.4 / 100 dá 16.500000000000004 (iria para 17); o exato é 16,5 → 16.
    expect(applyPercent(cents(375), 4.4)).toBe(16);
    expect(applyPercent(cents(625), 1.36)).toBe(8); // float: 8.500000000000002
    expect(applyPercent(cents(375), 9.2)).toBe(34); // float: 34.49999999999999
    expect(applyPercent(cents(1_000_000), 0.035)).toBe(350);
    expect(applyPercent(cents(100_000_000_000), 1e-7)).toBe(100); // notação exponencial
    expect(applyPercent(cents(1), 1e15)).toBe(10_000_000_000_000);
    expect(applyPercent(cents(0), 1e21)).toBe(0); // String(1e21) é "1e+21"
  });

  it('não produz -0', () => {
    expect(Object.is(applyPercent(cents(-1), 10), 0)).toBe(true);
  });

  it('rejeita entradas inválidas e resultado fora do inteiro seguro', () => {
    expect(() => applyPercent(notCents, 10)).toThrow(RangeError);
    expect(() => applyPercent(cents(100), Number.NaN)).toThrow(RangeError);
    expect(() => applyPercent(cents(100), Infinity)).toThrow(RangeError);
    expect(() => applyPercent(MAX, 200)).toThrow(RangeError);
    expect(() => applyPercent(MAX, -200)).toThrow(RangeError);
  });
});
