import { describe, expect, it } from 'vitest';
import {
  compactMoney,
  compactReais,
  count,
  money,
  percent,
  percentagePoints,
  signedMoney,
  spokenMoney,
} from './format';

const NBSP = ' ';

describe('formatação de dinheiro', () => {
  it('usa o sinal de menos U+2212 e o + explícito', () => {
    expect(money(-8_590)).toBe(`−R$${NBSP}85,90`);
    expect(signedMoney(680_000)).toBe(`+R$${NBSP}6.800,00`);
    expect(signedMoney(-41_237)).toBe(`−R$${NBSP}412,37`);
    expect(signedMoney(0)).toBe(`R$${NBSP}0,00`);
  });

  it('eixos compactos, percentual com uma casa e variação em pontos percentuais', () => {
    expect(compactReais(200_000)).toBe(`2${NBSP}mil`);
    expect(compactReais(120_000_000)).toBe(`1,2${NBSP}mi`);
    expect(percent(10.000012)).toBe('10,0%');
    expect(percentagePoints(6.84)).toBe('+6,8 p.p.');
    expect(percentagePoints(-10)).toBe('−10,0 p.p.');
  });

  it('lê valores por extenso para leitores de tela', () => {
    expect(spokenMoney(-41_237)).toBe('menos 412 reais e 37 centavos');
    expect(spokenMoney(100)).toBe('1 real');
    expect(spokenMoney(5)).toBe('5 centavos');
  });
});

describe('valores extremos (pior caso)', () => {
  it('formata R$ 1 bilhão e −R$ 999.999.999,99 por inteiro', () => {
    expect(money(100_000_000_000)).toBe(`R$${NBSP}1.000.000.000,00`);
    expect(signedMoney(-99_999_999_999)).toBe(`−R$${NBSP}999.999.999,99`);
    expect(spokenMoney(-99_999_999_999)).toBe('menos 999999999 reais e 99 centavos');
  });

  it('rótulo direto de gráfico fica compacto a partir de R$ 100 mil, sem quebrar linha', () => {
    expect(compactMoney(9_999_999)).toBe(`R$${NBSP}99.999,99`);
    expect(compactMoney(12_345_678)).toBe(`R$${NBSP}123,5${NBSP}mil`);
    expect(compactMoney(-99_999_999_965)).toBe(`−R$${NBSP}1${NBSP}bi`);
  });

  it('contagens com separador de milhar', () => {
    expect(count(1_284)).toBe('1.284');
    expect(count(1)).toBe('1');
  });
});
