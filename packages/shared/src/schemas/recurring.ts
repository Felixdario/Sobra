import { z } from 'zod';
import { validationMessage } from './messages';
import { idSchema, isoDateTimeSchema, localDateSchema } from './common';
import { transactionTemplateSchema } from './transaction';

export const RECURRENCE_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;
export const RECURRENCE_INTERVAL_MAX = 99;

export const recurrenceFrequencySchema = z.enum(RECURRENCE_FREQUENCIES, {
  error: validationMessage('recurring.frequencyInvalid'),
});

export const recurrenceRuleSchema = z
  .object(
    {
      frequency: recurrenceFrequencySchema,
      interval: z
        .int({ error: validationMessage('recurring.intervalNotInteger') })
        .min(1, { error: validationMessage('recurring.intervalTooSmall') })
        .max(RECURRENCE_INTERVAL_MAX, {
          error: validationMessage('recurring.intervalTooLarge', { max: RECURRENCE_INTERVAL_MAX }),
        })
        .default(1),
      startDate: localDateSchema,
      endDate: localDateSchema.optional(),
      dayOfMonth: z
        .int({ error: validationMessage('recurring.dayOfMonthNotInteger') })
        .min(1, { error: validationMessage('recurring.dayOfMonthOutOfRange') })
        .max(31, { error: validationMessage('recurring.dayOfMonthOutOfRange') })
        .optional(),
    },
    { error: validationMessage('recurring.ruleRequired') },
  )
  .refine((rule) => rule.endDate === undefined || rule.endDate >= rule.startDate, {
    error: validationMessage('recurring.endBeforeStart'),
    path: ['endDate'],
  })
  .refine((rule) => rule.dayOfMonth === undefined || rule.frequency !== 'weekly', {
    error: validationMessage('recurring.dayOfMonthWeekly'),
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
    active: z.boolean({ error: validationMessage('recurring.activeInvalid') }),
  })
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: validationMessage('common.updateEmpty'),
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
