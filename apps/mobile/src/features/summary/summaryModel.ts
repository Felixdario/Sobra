import {
  cents,
  sumCents,
  type BudgetVsActualItem,
  type Cents,
  type MonthKey,
  type MonthSummary,
  type SpendingByCategoryItem,
} from '@financas/shared';
import { formatMoney, formatPercent } from '../../lib/money';
import { monthName, progressLabel, type MonthProgress } from '../../lib/month';

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
export function buildHeadline(summary: MonthSummary, progress: MonthProgress): Headline {
  const result = net(summary.income, summary.expense);
  const received = formatMoney(summary.income, 'never');
  const spent = formatMoney(summary.expense, 'never');

  if (progress.kind !== 'closed') {
    const soFar = `Até agora: ${received} recebidos, ${spent} gastos · ${progressLabel(progress)}`;
    if (result < 0 || summary.income === 0) {
      return {
        label: 'Gasto até agora',
        value: cents(-summary.expense),
        tone: 'neutral',
        detail: soFar,
        delta: null,
      };
    }
    return { label: 'Sobra até agora', value: result, tone: 'main', detail: soFar, delta: null };
  }

  const previousNet = net(summary.previous.income, summary.previous.expense);
  const change = cents(result - previousNet);
  const base = monthName(summary.previous.month);
  const delta =
    change === 0
      ? { text: `Igual a ${base}`, good: true, up: true }
      : {
          text: `${formatMoney(change, change > 0 ? 'always' : 'never')} ${change > 0 ? 'a mais' : 'a menos'} que em ${base}`,
          good: change > 0,
          up: change > 0,
        };

  if (result < 0) {
    return {
      label: 'Faltaram',
      value: cents(-result),
      tone: 'debt',
      detail: `${spent} gastos para ${received} recebidos`,
      delta,
    };
  }
  const rate =
    summary.savingsRate === null ? '' : ` · taxa de poupança ${formatPercent(summary.savingsRate)}`;
  return {
    label: 'Sobrou',
    value: result,
    tone: 'main',
    detail: `de ${received} recebidos${rate}`,
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

/** Up to four categories by name, the rest folded into "Outras" (dataviz: never cycle tones). */
export const RULER_CATEGORIES = 4;

export function buildRuler(income: Cents, items: readonly SpendingByCategoryItem[]): Ruler {
  const sorted = [...items].filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, RULER_CATEGORIES);
  const tail = sorted.slice(RULER_CATEGORIES);
  const expense = sumCents(sorted.map((item) => item.amount));
  const scale = cents(Math.max(income, expense));
  const share = (amount: Cents) => (scale === 0 ? 0 : amount / scale);
  const segments: RulerSegment[] = head.map((item) => ({
    key: item.categoryId,
    name: item.name,
    amount: item.amount,
    share: share(item.amount),
  }));
  if (tail.length > 0) {
    const amount = sumCents(tail.map((item) => item.amount));
    segments.push({ key: 'outras', name: 'Outras', amount, share: share(amount) });
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

export function budgetText(item: BudgetVsActualItem): string {
  const remaining = formatMoney(cents(Math.abs(item.remaining)), 'never');
  switch (budgetStatus(item)) {
    case 'over':
      return `${remaining} acima`;
    case 'near':
      return `Perto do limite · restam ${remaining}`;
    case 'ok':
      return `Restam ${remaining}`;
  }
}

export function emptyMonthText(month: MonthKey): string {
  return `Nenhum lançamento em ${monthName(month)}. Lance o primeiro gasto.`;
}
