import { categoryName, type Translator } from '@sobra/i18n';
import type { MonthSummary, SpendingByCategory } from '@sobra/shared';
import type { MonthProgress } from '../lib/month';
import { PLANE_COUNT } from '../theme/tokensCss';

export type Plane = {
  key: string;
  name: string;
  amount: number;
  color: string | null;
  /** Where the plane starts on the ruler (sum of the larger planes before it). */
  start: number;
};

export type Ruler = {
  /** Width of the bar: the income, or the expense when it went past the income. */
  scale: number;
  planes: Plane[];
  income: number;
  /** income − expense; negative means the month spent more than it received. */
  left: number;
};

/** Expense planes for the ruler: the largest categories, the tail folded into "Outras". */
export function rulerPlanes(spending: SpendingByCategory, expense: number, t: Translator): Plane[] {
  const sorted = [...spending.items].sort((a, b) => b.amount - a.amount);
  const shown = sorted.length > PLANE_COUNT ? sorted.slice(0, PLANE_COUNT - 1) : sorted;
  const planes: Plane[] = [];
  let start = 0;
  for (const item of shown) {
    planes.push({
      key: item.categoryId,
      name: categoryName(t, item),
      amount: item.amount,
      color: item.color,
      start,
    });
    start += item.amount;
  }
  const rest = expense - start;
  if (rest > 0) {
    planes.push({
      key: 'outras',
      name: t('web.dashboard.ruler.others'),
      amount: rest,
      color: null,
      start,
    });
  }
  return planes;
}

export function buildRuler(
  summary: MonthSummary,
  spending: SpendingByCategory,
  t: Translator,
): Ruler {
  return {
    scale: Math.max(summary.income, summary.expense),
    planes: rulerPlanes(spending, summary.expense, t),
    income: summary.income,
    left: summary.income - summary.expense,
  };
}

/** Savings rate of any month, on the 0–100 scale; null without income. */
export function savingsRate(income: number, expense: number): number | null {
  return income > 0 ? ((income - expense) / income) * 100 : null;
}

export type SavingsHeadline =
  | { kind: 'rate'; rate: number; previous: number | null }
  | { kind: 'partial'; day: number; days: number }
  | { kind: 'none' };

/**
 * DESIGN.md, "Mês parcial": while the month is open the rate is not a fact yet (on day 4 the
 * salary may not have arrived and the rate reads −325%), so it is never the headline.
 */
export function savingsHeadline(summary: MonthSummary, progress: MonthProgress): SavingsHeadline {
  if (progress.partial) return { kind: 'partial', day: progress.day, days: progress.days };
  if (summary.savingsRate === null) return { kind: 'none' };
  return {
    kind: 'rate',
    rate: summary.savingsRate,
    previous: savingsRate(summary.previous.income, summary.previous.expense),
  };
}

export function isEmptyMonth(summary: MonthSummary): boolean {
  return summary.income === 0 && summary.expense === 0;
}

export type Trend = 'up' | 'down' | 'flat';

export function trendOf(value: number): Trend {
  return value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
}

/** Whether a change is good news: gaining income or balance, spending less. */
export function isGood(trend: Trend, upIsGood: boolean): boolean | null {
  if (trend === 'flat') return null;
  return (trend === 'up') === upIsGood;
}
