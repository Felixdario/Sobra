import { createTranslator } from '@sobra/i18n';
import { describe, expect, it } from 'vitest';
import { translateRowError } from '../imports/rowError';
import { createFormat } from './format';

const NBSP = ' ';
const br = createFormat('pt-BR', 'BRL');
const us = createFormat('en-US', 'USD');

describe('formatação pt-BR + BRL (a de sempre)', () => {
  it('usa o sinal de menos U+2212 e o + explícito', () => {
    expect(br.money(-8_590)).toBe(`−R$${NBSP}85,90`);
    expect(br.signedMoney(680_000)).toBe(`+R$${NBSP}6.800,00`);
    expect(br.signedMoney(-41_237)).toBe(`−R$${NBSP}412,37`);
    expect(br.signedMoney(0)).toBe(`R$${NBSP}0,00`);
  });

  it('eixos compactos, percentual com uma casa e variação em pontos percentuais', () => {
    expect(br.compactAmount(200_000)).toBe(`2${NBSP}mil`);
    expect(br.compactAmount(120_000_000)).toBe(`1,2${NBSP}mi`);
    expect(br.percent(10.000012)).toBe('10,0%');
    expect(br.percentagePoints(6.84)).toBe('+6,8 p.p.');
    expect(br.percentagePoints(-10)).toBe('−10,0 p.p.');
  });

  it('lê valores por extenso para leitores de tela', () => {
    expect(br.spokenMoney(-41_237)).toBe('menos 412 reais e 37 centavos');
    expect(br.spokenMoney(100)).toBe('1 real');
    expect(br.spokenMoney(5)).toBe('5 centavos');
    expect(br.spokenMoney(0)).toBe('0 reais');
    expect(br.spokenMoney(-99_999_999_999)).toBe('menos 999999999 reais e 99 centavos');
  });

  it('valores extremos por inteiro e rótulo de gráfico compacto a partir de 100 mil', () => {
    expect(br.money(100_000_000_000)).toBe(`R$${NBSP}1.000.000.000,00`);
    expect(br.compactMoney(9_999_999)).toBe(`R$${NBSP}99.999,99`);
    expect(br.compactMoney(12_345_678)).toBe(`R$${NBSP}123,5${NBSP}mil`);
    expect(br.compactMoney(-99_999_999_965)).toBe(`−R$${NBSP}1${NBSP}bi`);
  });

  it('contagens, meses, datas curtas e campos de valor', () => {
    expect(br.count(1_284)).toBe('1.284');
    expect(br.monthTitle('2026-10' as never)).toBe('Outubro de 2026');
    expect(br.monthName('2026-10' as never)).toBe('outubro');
    expect(br.shortDate('2026-10-18')).toBe('18 out');
    expect(br.moneyInput(123_456)).toBe('1.234,56');
    expect(br.parseMoney('1.234,56')).toBe(123_456);
    expect(br.currencySymbol).toBe('R$');
  });
});

describe('formatação en-US + USD', () => {
  it('dinheiro, compacto, percentual e pontos percentuais', () => {
    expect(us.money(-8_590)).toBe('−$85.90');
    expect(us.signedMoney(680_000)).toBe('+$6,800.00');
    expect(us.compactAmount(120_000_000)).toBe('1.2M');
    expect(us.compactMoney(12_345_678)).toBe('$123.5K');
    expect(us.percent(10)).toBe('10.0%');
    expect(us.percentagePoints(6.84)).toBe('+6.8 pp');
  });

  it('por extenso, meses, datas e campos de valor', () => {
    expect(us.spokenMoney(-41_237)).toBe('minus 412 dollars and 37 cents');
    expect(us.spokenMoney(100)).toBe('1 dollar');
    expect(us.count(1_284)).toBe('1,284');
    expect(us.monthTitle('2026-10' as never)).toBe('October 2026');
    expect(us.monthName('2026-10' as never)).toBe('October');
    expect(us.shortDate('2026-10-18')).toBe('Oct 18');
    expect(us.moneyInput(123_456)).toBe('1,234.56');
    expect(us.parseMoney('1,234.56')).toBe(123_456);
    expect(us.parseMoney('1.234,56')).toBeNull();
    expect(us.currencySymbol).toBe('$');
  });

  it('a moeda muda só o símbolo: os centavos são os mesmos (sem câmbio)', () => {
    expect(createFormat('en-US', 'BRL').money(76_990)).toBe('R$769.90');
    expect(createFormat('en-US', 'EUR').money(76_990)).toBe('€769.90');
    expect(createFormat('pt-BR', 'EUR').spokenMoney(200)).toBe('2 euros');
  });
});

describe('erros das linhas da prévia de importação', () => {
  const en = createTranslator('en-US');
  const pt = createTranslator('pt-BR');

  it('traduz os textos que a API escreve, pelo texto', () => {
    expect(translateRowError(en, 'Valor zero não pode ser importado')).toBe(
      'A zero amount cannot be imported',
    );
    expect(translateRowError(en, 'Coluna descrição vazia')).toBe('Empty description column');
    expect(translateRowError(en, 'Coluna valor ausente')).toBe('Column amount is missing');
    expect(translateRowError(pt, 'Coluna data vazia')).toBe('Coluna data vazia');
  });

  it('texto desconhecido volta como veio', () => {
    expect(translateRowError(en, 'Algo novo da API')).toBe('Algo novo da API');
  });
});
