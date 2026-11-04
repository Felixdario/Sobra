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

export type BudgetUpsert = z.infer<typeof budgetUpsertSchema>;
export type BudgetUpsertInput = z.input<typeof budgetUpsertSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInput = z.input<typeof budgetSchema>;
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
