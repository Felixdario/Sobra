import { describe, expect, it } from 'vitest';
import {
  balanceHistorySchema,
  budgetVsActualSchema,
  incomeVsExpenseSeriesSchema,
  monthSummarySchema,
  spendingByCategorySchema,
  summaryMonthQuerySchema,
  summaryRangeQuerySchema,
} from './summary';

const categoryId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const monthSummary = {
  month: '2026-11',
  income: 800_000,
  expense: 560_000,
  balance: 240_000,
  savingsRate: 0.3,
  previous: { month: '2026-10', income: 0, expense: 100_000, balance: -100_000 },
  delta: {
    income: { absolute: 800_000, percent: null },
    expense: { absolute: 460_000, percent: 4.6 },
    balance: { absolute: 340_000, percent: -3.4 },
  },
};

describe('monthSummarySchema', () => {
  it('accepts nullable percentages when the previous base is zero', () => {
    expect(monthSummarySchema.safeParse(monthSummary).success).toBe(true);
    expect(monthSummarySchema.safeParse({ ...monthSummary, savingsRate: null }).success).toBe(true);
  });

  it('rejects float money and non-finite percentages', () => {
    expect(monthSummarySchema.safeParse({ ...monthSummary, income: 8000.5 }).success).toBe(false);
    expect(
      monthSummarySchema.safeParse({
        ...monthSummary,
        delta: { ...monthSummary.delta, expense: { absolute: 1, percent: Infinity } },
      }).success,
    ).toBe(false);
  });
});

describe('incomeVsExpenseSeriesSchema', () => {
  it('parses monthly points', () => {
    const series = {
      points: [{ month: '2026-10', income: 1, expense: 2, balance: -1 }],
    };
    expect(incomeVsExpenseSeriesSchema.parse(series)).toEqual(series);
    expect(
      incomeVsExpenseSeriesSchema.safeParse({
        points: [{ month: '2026-13', income: 1, expense: 2, balance: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe('spendingByCategorySchema', () => {
  it('parses items with color, icon and share', () => {
    expect(
      spendingByCategorySchema.safeParse({
        month: '2026-11',
        total: 10_000,
        items: [
          {
            categoryId,
            name: 'Mercado',
            color: '#F97316',
            icon: 'cart',
            amount: 10_000,
            percent: 1,
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('balanceHistorySchema', () => {
  it('uses dates for daily points and months for monthly points', () => {
    expect(
      balanceHistorySchema.safeParse({
        granularity: 'day',
        points: [{ date: '2026-11-04', balance: 100 }],
      }).success,
    ).toBe(true);
    expect(
      balanceHistorySchema.safeParse({
        granularity: 'month',
        points: [{ date: '2026-11', balance: -100 }],
      }).success,
    ).toBe(true);
    expect(
      balanceHistorySchema.safeParse({
        granularity: 'day',
        points: [{ date: '2026-11', balance: 100 }],
      }).success,
    ).toBe(false);
  });
});

describe('budgetVsActualSchema', () => {
  it('parses an over-budget category', () => {
    expect(
      budgetVsActualSchema.safeParse({
        month: '2026-11',
        items: [
          {
            categoryId,
            name: 'Lazer',
            color: '#A855F7',
            budgeted: 20_000,
            actual: 25_000,
            remaining: -5_000,
            percentUsed: 1.25,
          },
        ],
        totals: { budgeted: 20_000, actual: 25_000, remaining: -5_000 },
      }).success,
    ).toBe(true);
  });
});

describe('summary queries', () => {
  it('parses a month query with an empty optional account', () => {
    expect(summaryMonthQuerySchema.parse({ month: '2026-11', accountId: '' })).toEqual({
      month: '2026-11',
    });
  });

  it('rejects a range that ends before it starts', () => {
    expect(summaryRangeQuerySchema.safeParse({ from: '2026-01', to: '2026-12' }).success).toBe(
      true,
    );
    expect(
      summaryRangeQuerySchema.safeParse({ from: '2026-12', to: '2026-01' }).error?.issues[0]
        ?.message,
    ).toBe('O mês inicial deve ser igual ou anterior ao mês final');
  });
});
