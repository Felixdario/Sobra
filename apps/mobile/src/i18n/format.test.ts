import { cents, monthKey } from '@sobra/shared';
import { createI18n } from './format';

const NBSP = String.fromCharCode(0xa0);
const MINUS = '−';
const pt = createI18n('pt-BR', 'BRL');
const en = createI18n('en-US', 'USD');

describe('dinheiro em pt-BR / BRL', () => {
  it('usa o sinal de menos U+2212, nunca o hífen', () => {
    expect(pt.money(cents(-41_237))).toBe(`${MINUS}R$${NBSP}412,37`);
  });

  it('mostra + só quando pedido e deixa o zero sem sinal', () => {
    expect(pt.money(cents(680_000), 'always')).toBe(`+R$${NBSP}6.800,00`);
    expect(pt.money(cents(680_000))).toBe(`R$${NBSP}6.800,00`);
    expect(pt.money(cents(0), 'always')).toBe(`R$${NBSP}0,00`);
    expect(pt.money(cents(-500), 'never')).toBe(`R$${NBSP}5,00`);
  });

  it('lê o valor por extenso para o leitor de tela', () => {
    expect(pt.speakMoney(cents(-41_237))).toBe('menos 412 reais e 37 centavos');
    expect(pt.speakMoney(cents(100))).toBe('1 real');
    expect(pt.speakMoney(cents(50))).toBe('50 centavos');
    expect(pt.speakMoney(cents(0))).toBe('0 reais');
    expect(pt.speakMoney(cents(9_999_999_999))).toBe('99.999.999 reais e 99 centavos');
  });
});

describe('dinheiro em en-US', () => {
  it('USD: "$12.50", separador decimal ponto, milhar vírgula', () => {
    expect(en.money(cents(1_250))).toBe('$12.50');
    expect(en.money(cents(-123_456))).toBe(`${MINUS}$1,234.56`);
    expect(en.money(cents(680_000), 'always')).toBe('+$6,800.00');
  });

  it('a moeda só troca o símbolo: os centavos são os mesmos (sem câmbio)', () => {
    expect(createI18n('en-US', 'BRL').money(cents(1_250))).toBe('R$12.50');
    expect(createI18n('en-US', 'EUR').money(cents(1_250))).toBe('€12.50');
    expect(createI18n('pt-BR', 'USD').money(cents(1_250))).toBe(`US$${NBSP}12,50`);
  });

  it('lê em inglês, com o nome da moeda escolhida', () => {
    expect(en.speakMoney(cents(-41_237))).toBe('minus 412 dollars and 37 cents');
    expect(en.speakMoney(cents(100))).toBe('1 dollar');
    expect(en.speakMoney(cents(1))).toBe('1 cent');
    expect(en.speakMoney(cents(9_999_999_999))).toBe('99,999,999 dollars and 99 cents');
    expect(createI18n('en-US', 'EUR').speakMoney(cents(250))).toBe('2 euros and 50 cents');
    expect(createI18n('pt-BR', 'USD').speakMoney(cents(100))).toBe('1 dólar');
  });
});

describe('datas e meses', () => {
  const now = new Date('2026-11-04T15:00:00Z');

  it('Hoje/Ontem e data curta por idioma', () => {
    expect(['2026-11-04', '2026-11-03', '2026-11-02'].map((d) => pt.dayLabel(d, now))).toEqual([
      'Hoje',
      'Ontem',
      'seg., 2 de nov.',
    ]);
    expect(['2026-11-04', '2026-11-03', '2026-11-02'].map((d) => en.dayLabel(d, now))).toEqual([
      'Today',
      'Yesterday',
      'Mon, Nov 2',
    ]);
  });

  it('título e nome do mês, progresso e percentual', () => {
    expect(pt.monthTitle(monthKey('2026-10'))).toBe('Outubro de 2026');
    expect(en.monthTitle(monthKey('2026-10'))).toBe('October 2026');
    expect(en.monthName(monthKey('2026-10'))).toBe('October');
    expect(en.progressLabel({ kind: 'partial', day: 4, daysInMonth: 30 })).toBe(
      'partial · day 4 of 30',
    );
    expect(pt.percent(1000)).toBe('1.000,0%');
    expect(en.percent(1000)).toBe('1,000.0%');
  });

  it('categoria padrão traduzida pelo systemKey; renomeada mantém o nome', () => {
    expect(en.category({ name: 'Mercado', systemKey: 'groceries' })).toBe('Groceries');
    expect(en.category({ name: 'Feira', systemKey: null })).toBe('Feira');
  });
});
