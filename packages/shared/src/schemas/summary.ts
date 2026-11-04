import { z } from 'zod';
import {
  centsSchema,
  fromQuery,
  hexColorSchema,
  iconSchema,
  idSchema,
  localDateSchema,
  monthKeySchema,
  positiveCentsSchema,
} from './common';

/**
 * Percentages across the whole contract are on a 0–100 scale (12.5 means 12.5%), as returned by
 * `percentOf`; they may pass 100 or go negative (an overspent budget, a variation). Never a
 * 0–1 fraction.
 */
export const percentSchema = z.number().finite();

/** Change from the previous month. `percent` (0–100 scale) is null when the previous value is 0. */
export const deltaSchema = z.object({
  absolute: centsSchema,
  percent: percentSchema.nullable(),
});

/**
 * `balance` is the real total balance at the end of the month. `savingsRate` is
 * (income − expense) / income on the 0–100 scale, null without income.
 */
export const monthSummarySchema = z.object({
  month: monthKeySchema,
  income: centsSchema,
  expense: centsSchema,
  balance: centsSchema,
  savingsRate: percentSchema.nullable(),
  previous: z.object({
    month: monthKeySchema,
    income: centsSchema,
    expense: centsSchema,
    balance: centsSchema,
  }),
  delta: z.object({
    income: deltaSchema,
    expense: deltaSchema,
    balance: deltaSchema,
  }),
});

/** `net` is the month's result (income − expense), not an account balance. */
export const incomeVsExpensePointSchema = z.object({
  month: monthKeySchema,
  income: centsSchema,
  expense: centsSchema,
  net: centsSchema,
});

export const incomeVsExpenseSeriesSchema = z.object({
  points: z.array(incomeVsExpensePointSchema),
});

/** `percent` is the category's share of the month's expenses (0–100 scale). */
export const spendingByCategoryItemSchema = z.object({
  categoryId: idSchema,
  name: z.string(),
  color: hexColorSchema,
  icon: iconSchema,
  amount: centsSchema,
  percent: percentSchema,
});

export const spendingByCategorySchema = z.object({
  month: monthKeySchema,
  total: centsSchema,
  items: z.array(spendingByCategoryItemSchema),
});

export const balanceHistorySchema = z.discriminatedUnion('granularity', [
  z.object({
    granularity: z.literal('day'),
    points: z.array(z.object({ date: localDateSchema, balance: centsSchema })),
  }),
  z.object({
    granularity: z.literal('month'),
    points: z.array(z.object({ date: monthKeySchema, balance: centsSchema })),
  }),
]);

/** `percentUsed` = actual / budgeted on the 0–100 scale; above 100 means over budget. */
export const budgetVsActualItemSchema = z.object({
  categoryId: idSchema,
  name: z.string(),
  color: hexColorSchema,
  budgeted: positiveCentsSchema,
  actual: centsSchema,
  remaining: centsSchema,
  percentUsed: percentSchema,
});

export const budgetVsActualSchema = z.object({
  month: monthKeySchema,
  items: z.array(budgetVsActualItemSchema),
  totals: z.object({
    budgeted: centsSchema,
    actual: centsSchema,
    remaining: centsSchema,
  }),
});

export const summaryMonthQuerySchema = z.object({
  month: monthKeySchema,
  accountId: fromQuery(idSchema),
});

export const summaryRangeQuerySchema = z
  .object({
    from: monthKeySchema,
    to: monthKeySchema,
    accountId: fromQuery(idSchema),
    granularity: fromQuery(z.enum(['day', 'month'], { error: 'Granularidade inválida' })),
  })
  .refine((query) => query.from <= query.to, {
    error: 'O mês inicial deve ser igual ou anterior ao mês final',
    path: ['to'],
  });

export type Delta = z.infer<typeof deltaSchema>;
export type MonthSummary = z.infer<typeof monthSummarySchema>;
export type MonthSummaryInput = z.input<typeof monthSummarySchema>;
export type IncomeVsExpensePoint = z.infer<typeof incomeVsExpensePointSchema>;
export type IncomeVsExpenseSeries = z.infer<typeof incomeVsExpenseSeriesSchema>;
export type SpendingByCategoryItem = z.infer<typeof spendingByCategoryItemSchema>;
export type SpendingByCategory = z.infer<typeof spendingByCategorySchema>;
export type BalanceHistory = z.infer<typeof balanceHistorySchema>;
export type BudgetVsActualItem = z.infer<typeof budgetVsActualItemSchema>;
export type BudgetVsActual = z.infer<typeof budgetVsActualSchema>;
export type SummaryMonthQuery = z.infer<typeof summaryMonthQuerySchema>;
export type SummaryRangeQuery = z.infer<typeof summaryRangeQuerySchema>;
