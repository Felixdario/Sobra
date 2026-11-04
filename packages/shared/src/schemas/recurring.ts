import { z } from 'zod';
import { idSchema, isoDateTimeSchema, localDateSchema } from './common';
import { transactionTemplateSchema } from './transaction';

export const RECURRENCE_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;
export const RECURRENCE_INTERVAL_MAX = 99;

export const recurrenceFrequencySchema = z.enum(RECURRENCE_FREQUENCIES, {
  error: 'Frequência inválida: use weekly, monthly ou yearly',
});

export const recurrenceRuleSchema = z
  .object({
    frequency: recurrenceFrequencySchema,
    interval: z
      .int({ error: 'O intervalo deve ser um número inteiro' })
      .min(1, { error: 'O intervalo deve ser no mínimo 1' })
      .max(RECURRENCE_INTERVAL_MAX, {
        error: `O intervalo deve ser no máximo ${RECURRENCE_INTERVAL_MAX}`,
      })
      .default(1),
    startDate: localDateSchema,
    endDate: localDateSchema.optional(),
    dayOfMonth: z
      .int({ error: 'O dia do mês deve ser um número inteiro' })
      .min(1, { error: 'O dia do mês deve estar entre 1 e 31' })
      .max(31, { error: 'O dia do mês deve estar entre 1 e 31' })
      .optional(),
  })
  .refine((rule) => rule.endDate === undefined || rule.endDate >= rule.startDate, {
    error: 'A data final deve ser igual ou posterior à data inicial',
    path: ['endDate'],
  })
  .refine((rule) => rule.dayOfMonth === undefined || rule.frequency !== 'weekly', {
    error: 'O dia do mês não se aplica à recorrência semanal',
    path: ['dayOfMonth'],
  });

export const recurringCreateSchema = z.object({
  rule: recurrenceRuleSchema,
  template: transactionTemplateSchema,
});

export const recurringUpdateSchema = z
  .object({
    rule: recurrenceRuleSchema,
    template: transactionTemplateSchema,
    active: z.boolean({ error: 'O campo ativa deve ser verdadeiro ou falso' }),
  })
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: 'Informe ao menos um campo para atualizar',
  });

export const recurringSchema = z.object({
  id: idSchema,
  rule: recurrenceRuleSchema,
  template: transactionTemplateSchema,
  active: z.boolean(),
  nextOccurrence: localDateSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const recurringSyncResultSchema = z.object({
  created: z.int().min(0).describe('Transações geradas nesta sincronização'),
});

export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
export type RecurrenceRuleInput = z.input<typeof recurrenceRuleSchema>;
export type RecurringCreate = z.infer<typeof recurringCreateSchema>;
export type RecurringCreateInput = z.input<typeof recurringCreateSchema>;
export type RecurringUpdate = z.infer<typeof recurringUpdateSchema>;
export type RecurringUpdateInput = z.input<typeof recurringUpdateSchema>;
export type Recurring = z.infer<typeof recurringSchema>;
export type RecurringInput = z.input<typeof recurringSchema>;
export type RecurringSyncResult = z.infer<typeof recurringSyncResultSchema>;
