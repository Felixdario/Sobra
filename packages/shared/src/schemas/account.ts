import { z } from 'zod';
import { validationMessage } from './messages';
import { cents } from '../money/cents';
import {
  centsSchema,
  hexColorSchema,
  iconSchema,
  idSchema,
  isoDateTimeSchema,
  nameSchema,
} from './common';

export const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'cash'] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES, {
  error: validationMessage('account.typeInvalid'),
});

const accountNameSchema = nameSchema(60);

export const accountCreateSchema = z.object({
  name: accountNameSchema,
  type: accountTypeSchema,
  initialBalance: centsSchema.default(cents(0)),
  color: hexColorSchema,
  icon: iconSchema,
});

export const accountUpdateSchema = z
  .object({
    name: accountNameSchema,
    initialBalance: centsSchema,
    color: hexColorSchema,
    icon: iconSchema,
    archived: z.boolean({ error: validationMessage('account.archivedInvalid') }),
  })
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: validationMessage('common.updateEmpty'),
  });

export const accountSchema = z.object({
  id: idSchema,
  name: z.string(),
  type: accountTypeSchema,
  initialBalance: centsSchema,
  balance: centsSchema,
  color: hexColorSchema,
  icon: iconSchema,
  archived: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountCreate = z.infer<typeof accountCreateSchema>;
export type AccountCreateInput = z.input<typeof accountCreateSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;
export type AccountUpdateInput = z.input<typeof accountUpdateSchema>;
export type Account = z.infer<typeof accountSchema>;
export type AccountInput = z.input<typeof accountSchema>;
