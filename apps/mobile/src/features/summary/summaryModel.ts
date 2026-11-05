import {
  cents,
  sumCents,
  type BudgetVsActualItem,
  type Cents,
  type MonthKey,
  type MonthSummary,
  type SpendingByCategoryItem,
} from '@sobra/shared';
import type { I18n } from '../../i18n/format';
import type { MonthProgress } from '../../lib/month';

export type Headline = {
  label: string;
  value: Cents;
  /** `main`/`neutral`: ink, like the web; `debt`: what was missing, with − in the debt tone. */
  tone: 'main' | 'debt' | 'neutral';
  /** What the number means, in words. */
  detail: string;
  delta: { text: string; good: boolean; up: boolean } | null;
};

const net = (income: Cents, expense: Cents) => cents(income - expense);

/**
 * The month's headline (DESIGN.md, "Cartão de KPI"). A partial month never shows a savings
 * rate it hasn't earned yet: while spending is ahead of income, the card reads "Gasto até agora"
 * with what came in and went out, and no variation against a closed month.
 */
export function buildHeadline(
  summary: MonthSummary,
  progress: MonthProgress,
  i18n: I18n,
): Headline {
  const { t } = i18n;
  const result = net(summary.income, summary.expense);
  const received = i18n.money(summary.income, 'never');
  const spent = i18n.money(summary.expense, 'never');

  if (progress.kind !== 'closed') {
    const soFar = t('mobile.summary.headline.soFar', {
      received,
      spent,
      progress: i18n.progressLabel(progress),
    });
    if (result < 0 || summary.income === 0) {
      return {
        label: t('mobile.summary.headline.spentSoFar'),
        value: cents(-summary.expense),
        tone: 'neutral',
        detail: soFar,
        delta: null,
      };
    }
    return {
      label: t('mobile.summary.headline.leftSoFar'),
      value: result,
      tone: 'main',
      detail: soFar,
      delta: null,
    };
  }

  const previousNet = net(summary.previous.income, summary.previous.expense);
  const change = cents(result - previousNet);
  const month = i18n.monthName(summary.previous.month);
  const delta =
    change === 0
      ? { text: t('mobile.summary.headline.same', { month }), good: true, up: true }
      : {
          text: t(change > 0 ? 'mobile.summary.headline.more' : 'mobile.summary.headline.less', {
            amount: i18n.money(change, change > 0 ? 'always' : 'never'),
            month,
          }),
          good: change > 0,
          up: change > 0,
        };

  if (result < 0) {
    return {
      label: t('mobile.summary.headline.short'),
      value: cents(-result),
      tone: 'debt',
      detail: t('mobile.summary.headline.shortDetail', { spent, received }),
      delta,
    };
  }
  return {
    label: t('mobile.summary.headline.left'),
    value: result,
    tone: 'main',
    detail:
      summary.savingsRate === null
        ? t('mobile.summary.headline.leftDetail', { received })
        : t('mobile.summary.headline.leftDetailRate', {
            received,
            rate: i18n.percent(summary.savingsRate),
          }),
    delta,
  };
}

export type RulerSegment = { key: string; name: string; amount: Cents; share: number };

export type Ruler = {
  /** Width of the bar in cents: the larger of income and spending. */
  scale: Cents;
  income: Cents;
  segments: RulerSegment[];
  sobra: Cents;
  over: Cents;
};

/** Up to four categories by name, the rest folded into "Outras" / "Others" (dataviz: never cycle tones). */
export const RULER_CATEGORIES = 4;

export function buildRuler(
  income: Cents,
  items: readonly SpendingByCategoryItem[],
  i18n: Pick<I18n, 't' | 'category'>,
): Ruler {
  const sorted = [...items].filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, RULER_CATEGORIES);
  const tail = sorted.slice(RULER_CATEGORIES);
  const expense = sumCents(sorted.map((item) => item.amount));
  const scale = cents(Math.max(income, expense));
  const share = (amount: Cents) => (scale === 0 ? 0 : amount / scale);
  const segments: RulerSegment[] = head.map((item) => ({
    key: item.categoryId,
    name: i18n.category(item),
    amount: item.amount,
    share: share(item.amount),
  }));
  if (tail.length > 0) {
    const amount = sumCents(tail.map((item) => item.amount));
    segments.push({
      key: 'outras',
      name: i18n.t('mobile.summary.ruler.others'),
      amount,
      share: share(amount),
    });
  }
  return {
    scale,
    income,
    segments,
    sobra: cents(Math.max(income - expense, 0)),
    over: cents(Math.max(expense - income, 0)),
  };
}

export type BudgetStatus = 'ok' | 'near' | 'over';

/** Thresholds from DESIGN.md: under 85% folgado, 85–100% perto do limite, above 100% estourado. */
export function budgetStatus(item: Pick<BudgetVsActualItem, 'percentUsed'>): BudgetStatus {
  if (item.percentUsed > 100) return 'over';
  if (item.percentUsed >= 85) return 'near';
  return 'ok';
}

export function budgetText(item: BudgetVsActualItem, i18n: I18n): string {
  const amount = i18n.money(cents(Math.abs(item.remaining)), 'never');
  switch (budgetStatus(item)) {
    case 'over':
      return i18n.t('mobile.summary.budget.over', { amount });
    case 'near':
      return i18n.t('mobile.summary.budget.near', { amount });
    case 'ok':
      return i18n.t('mobile.summary.budget.ok', { amount });
  }
}

export function emptyMonthText(month: MonthKey, i18n: I18n): string {
  return i18n.t('mobile.summary.empty', { month: i18n.monthName(month) });
}
