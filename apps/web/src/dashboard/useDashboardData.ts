import { lastNMonths, type MonthKey } from '@financas/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useServices } from '../lib/servicesContext';

export const HISTORY_MONTHS = 6;

/** The five summary reads of the dashboard. Previous data stays on screen while a month loads. */
export function useDashboardData(month: MonthKey) {
  const { queries } = useServices();
  const from = lastNMonths(HISTORY_MONTHS, month)[0] ?? month;
  const keep = { placeholderData: keepPreviousData };
  return {
    summary: useQuery({ ...queries.summary.month({ month }), ...keep }),
    spending: useQuery({ ...queries.summary.spendingByCategory({ month }), ...keep }),
    history: useQuery({
      ...queries.summary.incomeVsExpense({ from, to: month }),
      ...keep,
    }),
    balance: useQuery({
      ...queries.summary.balanceHistory({ from, to: month, granularity: 'day' }),
      ...keep,
    }),
    budgets: useQuery({ ...queries.summary.budgetVsActual(month), ...keep }),
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
