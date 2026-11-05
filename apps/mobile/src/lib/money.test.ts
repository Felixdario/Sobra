import { cents } from '@sobra/shared';
import { formatMoney, MINUS, speakMoney } from './money';

const NBSP = ' ';

describe('formatMoney', () => {
  it('usa o sinal de menos U+2212, nunca o hífen', () => {
    expect(formatMoney(cents(-41_237))).toBe(`${MINUS}R$${NBSP}412,37`);
    expect(MINUS).toBe('−');
  });

  it('mostra + só quando pedido e deixa o zero sem sinal', () => {
    expect(formatMoney(cents(680_000), 'always')).toBe(`+R$${NBSP}6.800,00`);
    expect(formatMoney(cents(680_000))).toBe(`R$${NBSP}6.800,00`);
    expect(formatMoney(cents(0), 'always')).toBe(`R$${NBSP}0,00`);
  });
});

describe('speakMoney', () => {
  it('lê o valor por extenso para o leitor de tela', () => {
    expect(speakMoney(cents(-41_237))).toBe('menos 412 reais e 37 centavos');
    expect(speakMoney(cents(100))).toBe('1 real');
    expect(speakMoney(cents(50))).toBe('50 centavos');
  });
});
