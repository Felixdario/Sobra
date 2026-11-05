import { monthSummarySchema, spendingByCategorySchema } from '@financas/shared';
import { describe, expect, it } from 'vitest';
import { novemberPartial, october } from '../test/fakeApi';
import { buildRuler, rulerPlanes, savingsHeadline } from './model';

const item = (n: number, amount: number) => ({
  categoryId: `0198f1c2-0000-7000-8000-0000000000${String(n).padStart(2, '0')}`,
  name: `Categoria ${n}`,
  color: '#1C50B5',
  icon: 'cart' as const,
  amount,
  percent: 0,
});

describe('régua do mês', () => {
  it('ordena as despesas da maior para a menor e junta o resto em "Outras"', () => {
    const spending = spendingByCategorySchema.parse({
      month: '2026-10',
      total: 2_800,
      items: [100, 700, 300, 600, 200, 400, 500].map((amount, i) => item(i + 1, amount)),
    });
    const planes = rulerPlanes(spending, 2_800);

    expect(planes.map((p) => p.amount)).toEqual([700, 600, 500, 400, 300, 300]);
    expect(planes.at(-1)?.name).toBe('Outras');
    expect(planes.map((p) => p.start)).toEqual([0, 700, 1_300, 1_800, 2_200, 2_500]);
  });

  it('gastar mais do que entrou aumenta a escala e o resultado fica negativo', () => {
    const summary = monthSummarySchema.parse(novemberPartial);
    const spending = spendingByCategorySchema.parse({ month: '2026-11', total: 26_316, items: [] });
    const ruler = buildRuler(summary, spending);

    expect(ruler.scale).toBe(26_316);
    expect(ruler.left).toBe(6_189 - 26_316);
  });
});

describe('taxa de poupança', () => {
  it('mês fechado: a taxa e a do mês anterior para comparar', () => {
    const headline = savingsHeadline(monthSummarySchema.parse(october), { partial: false });
    expect(headline).toMatchObject({ kind: 'rate' });
    if (headline.kind === 'rate') expect(headline.previous).toBeCloseTo(20.0, 0);
  });

  it('mês parcial: nunca vira manchete, mesmo com −325% vindo da API', () => {
    const headline = savingsHeadline(monthSummarySchema.parse(novemberPartial), {
      partial: true,
      day: 4,
      days: 30,
    });
    expect(headline).toEqual({ kind: 'partial', day: 4, days: 30 });
  });
});
