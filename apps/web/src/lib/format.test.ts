import { describe, expect, it } from 'vitest';
import { compactReais, money, percent, percentagePoints, signedMoney, spokenMoney } from './format';

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
