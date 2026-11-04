import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MonthKey } from '../date/month';
import { budgetCopySchema, budgetQuerySchema, budgetSchema, budgetUpsertSchema } from './budget';

const categoryId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('budgetUpsertSchema', () => {
  it('accepts a positive amount for a month', () => {
    expect(budgetUpsertSchema.parse({ categoryId, month: '2026-11', amount: 80_000 })).toEqual({
      categoryId,
      month: '2026-11',
      amount: 80_000,
    });
  });

  it('rejects zero, floats and invalid months', () => {
    expect(budgetUpsertSchema.safeParse({ categoryId, month: '2026-11', amount: 0 }).success).toBe(
      false,
    );
    expect(
      budgetUpsertSchema.safeParse({ categoryId, month: '2026-11', amount: 10.5 }).success,
    ).toBe(false);
    expect(
      budgetUpsertSchema.safeParse({ categoryId, month: '2026-13', amount: 100 }).error?.issues[0]
        ?.message,
    ).toBe('Mês inválido: use o formato AAAA-MM');
  });
});

describe('budgetSchema', () => {
  it('allows a negative remaining when the budget is exceeded', () => {
    const budget = budgetSchema.parse({
      id: '0190f5b3-7c1e-7a2b-8c3d-4e5f60718293',
      categoryId,
      month: '2026-11',
      amount: 50_000,
      spent: 62_500,
      remaining: -12_500,
    });
    expect(budget.remaining).toBe(-12_500);
    expectTypeOf(budget.month).toEqualTypeOf<MonthKey>();
  });
});

describe('budgetQuerySchema', () => {
  it('requires a month', () => {
    expect(budgetQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('budgetCopySchema', () => {
  it('requires two valid months', () => {
    expect(budgetCopySchema.parse({ from: '2026-10', to: '2026-11' })).toEqual({
      from: '2026-10',
      to: '2026-11',
    });
    expect(budgetCopySchema.safeParse({ from: '2026-10' }).success).toBe(false);
  });
});
