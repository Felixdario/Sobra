import { budgetVsActualItemSchema, cents, monthKey, monthSummarySchema } from '@sobra/shared';
import { budgets, ids, monthSummary, spending } from '../../test/fixtures';
import { createI18n } from '../../i18n/format';
import { budgetStatus, budgetText, buildHeadline, buildRuler } from './summaryModel';

const pt = createI18n('pt-BR', 'BRL');
const en = createI18n('en-US', 'USD');

const summary = (values: Parameters<typeof monthSummary>[2]) =>
  monthSummarySchema.parse(monthSummary('2026-10', '2026-09', values));

describe('manchete do mês', () => {
  it('mês fechado: sobra com taxa de poupança e variação nomeando a base', () => {
    const headline = buildHeadline(
      summary({
        income: 769_899,
        expense: 692_909,
        previousIncome: 700_000,
        previousExpense: 540_000,
      }),
      { kind: 'closed' },
      pt,
    );
    expect(headline.label).toBe('Sobrou');
    expect(headline.value).toBe(76_990);
    expect(headline.detail).toContain('taxa de poupança 10,0%');
    expect(headline.delta?.text).toBe('R$ 830,10 a menos que em setembro');
    expect(headline.delta?.good).toBe(false);
  });

  it('mês fechado no vermelho diz quanto faltou', () => {
    const headline = buildHeadline(
      summary({ income: 500_000, expense: 523_000 }),
      {
        kind: 'closed',
      },
      pt,
    );
    expect(headline.label).toBe('Faltaram');
    expect(headline.value).toBe(23_000);
    expect(headline.tone).toBe('debt');
  });

  it('mês parcial antes do salário não mostra taxa nem dramatiza (sem −2.154%)', () => {
    const partial = monthSummarySchema.parse({
      ...monthSummary('2026-11', '2026-10', { income: 5_500, expense: 124_000 }),
      savingsRate: -2154.5,
    });
    const headline = buildHeadline(partial, { kind: 'partial', day: 4, daysInMonth: 30 }, pt);
    const text = JSON.stringify(headline);
    expect(headline.label).toBe('Gasto até agora');
    expect(headline.detail).toBe(
      'Até agora: R$ 55,00 recebidos, R$ 1.240,00 gastos · parcial · dia 4 de 30',
    );
    expect(text).not.toMatch(/%/);
    expect(text).not.toContain('Faltaram');
    expect(headline.delta).toBeNull();
  });
});

describe('régua e orçamentos', () => {
  it('a régua mostra até quatro categorias e junta o resto em Outras', () => {
    const items = spending('2026-10', [
      [ids.mercado, 400],
      [ids.transporte, 300],
      [ids.lazer, 200],
      [ids.salario, 50],
      ['00000000-0000-4000-8000-0000000000c9', 50],
      ['00000000-0000-4000-8000-0000000000c8', 25],
    ]).items;
    const ruler = buildRuler(cents(1_500), items, pt);
    expect(ruler.segments.map((segment) => segment.name)).toEqual([
      'Mercado',
      'Transporte',
      'Lazer',
      'Salário',
      'Outras',
    ]);
    expect(ruler.segments.at(-1)?.amount).toBe(75);
    expect(ruler.sobra).toBe(475);
    expect(ruler.over).toBe(0);
    expect(buildRuler(cents(500), items, pt).over).toBe(525);
  });

  it('orçamento: folgado abaixo de 85%, perto do limite até 100%, estourado acima', () => {
    const [ok, near, over] = budgets(monthKey('2026-10'), [
      [ids.mercado, 10_000, 8_400],
      [ids.transporte, 10_000, 9_000],
      [ids.lazer, 30_000, 160_153],
    ]).items.map((item) => budgetVsActualItemSchema.parse(item));
    expect([ok, near, over].map((item) => item && budgetStatus(item))).toEqual([
      'ok',
      'near',
      'over',
    ]);
    expect(budgetText(over!, pt)).toBe('R$ 1.301,53 acima');
    expect(budgetText(near!, pt)).toBe('Perto do limite · restam R$ 10,00');
  });
});

describe('en-US / USD', () => {
  it('manchete com mês e valores em inglês, sem conversão de câmbio', () => {
    const headline = buildHeadline(
      summary({
        income: 769_899,
        expense: 692_909,
        previousIncome: 700_000,
        previousExpense: 540_000,
      }),
      { kind: 'closed' },
      en,
    );
    expect(headline.label).toBe('Left over');
    expect(headline.detail).toBe('of $7,698.99 received · savings rate 10.0%');
    expect(headline.delta?.text).toBe('$830.10 less than in September');
  });

  it('orçamento em inglês', () => {
    const [near, over] = budgets(monthKey('2026-10'), [
      [ids.transporte, 10_000, 9_000],
      [ids.lazer, 30_000, 160_153],
    ]).items.map((item) => budgetVsActualItemSchema.parse(item));
    expect(budgetText(over!, en)).toBe('$1,301.53 over');
    expect(budgetText(near!, en)).toBe('Near the limit · $10.00 left');
  });

  it('categorias padrão aparecem traduzidas na régua; renomeadas ficam como estão', () => {
    const items = spending('2026-10', [
      [ids.mercado, 400],
      [ids.transporte, 300],
    ]).items.map((item, index) => ({
      ...item,
      systemKey: index === 0 ? ('groceries' as const) : null,
    }));
    expect(buildRuler(cents(1_000), items, en).segments.map((s) => s.name)).toEqual([
      'Groceries',
      'Transporte',
    ]);
  });
});
