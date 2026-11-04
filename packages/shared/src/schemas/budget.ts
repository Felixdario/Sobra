import { z } from 'zod';
import { centsSchema, idSchema, monthKeySchema, positiveCentsSchema } from './common';

export const budgetUpsertSchema = z.object({
  categoryId: z.uuid({ error: 'Informe uma categoria válida' }),
  month: monthKeySchema,
  amount: positiveCentsSchema,
});

export const budgetSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  month: monthKeySchema,
  amount: positiveCentsSchema,
  spent: centsSchema,
  remaining: centsSchema,
});

export const budgetQuerySchema = z.object({ month: monthKeySchema });

/** Copies the budgets of `from` into `to`; categories `to` already has are kept. */
export const budgetCopySchema = z.object({ from: monthKeySchema, to: monthKeySchema });

export type BudgetUpsert = z.infer<typeof budgetUpsertSchema>;
export type BudgetUpsertInput = z.input<typeof budgetUpsertSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInput = z.input<typeof budgetSchema>;
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
export type BudgetCopy = z.infer<typeof budgetCopySchema>;
export type BudgetCopyInput = z.input<typeof budgetCopySchema>;
