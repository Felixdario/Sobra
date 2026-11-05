import { z } from 'zod';
import { validationMessage } from './messages';
import {
  fromQuery,
  hexColorSchema,
  iconSchema,
  idSchema,
  isoDateTimeSchema,
  localDateSchema,
  monthKeySchema,
  paginationQuerySchema,
  positiveCentsSchema,
  sortSchema,
} from './common';
import { nullableSystemKeySchema } from './category';

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES, {
  error: validationMessage('transaction.typeInvalid'),
});

export const DESCRIPTION_MAX = 120;
export const NOTES_MAX = 500;

const descriptionSchema = z
  .string({ error: validationMessage('transaction.descriptionRequired') })
  .trim()
  .min(1, { error: validationMessage('transaction.descriptionRequired') })
  .max(DESCRIPTION_MAX, {
    error: validationMessage('transaction.descriptionTooLong', { max: DESCRIPTION_MAX }),
  });

const notesSchema = z
  .string({ error: validationMessage('transaction.notesInvalid') })
  .trim()
  .max(NOTES_MAX, { error: validationMessage('transaction.notesTooLong', { max: NOTES_MAX }) });

const categoryIdSchema = z.uuid({ error: validationMessage('category.required') });
const toAccountIdSchema = z.uuid({ error: validationMessage('transaction.toAccountRequired') });

function isDistinctTransfer(value: {
  accountId?: string | undefined;
  toAccountId?: string | undefined;
}): boolean {
  return (
    value.accountId === undefined ||
    value.toAccountId === undefined ||
    value.accountId !== value.toAccountId
  );
}

const distinctTransferCheck = {
  error: validationMessage('transaction.sameAccount'),
  path: ['toAccountId'],
};

const baseShape = {
  accountId: idSchema,
  amount: positiveCentsSchema,
  description: descriptionSchema,
  notes: notesSchema.optional(),
};

const incomeExpenseShape = {
  ...baseShape,
  type: z.enum(['income', 'expense'], { error: validationMessage('transaction.typeInvalid') }),
  categoryId: categoryIdSchema,
};

const transferShape = {
  ...baseShape,
  type: z.literal('transfer', { error: validationMessage('transaction.typeInvalid') }),
  toAccountId: toAccountIdSchema,
};

export const transactionTemplateSchema = z.discriminatedUnion(
  'type',
  [
    z.object(incomeExpenseShape),
    z.object(transferShape).refine(isDistinctTransfer, distinctTransferCheck),
  ],
  { error: validationMessage('transaction.typeInvalidHint') },
);

const dated = { date: localDateSchema };

export const transactionCreateSchema = z.discriminatedUnion(
  'type',
  [
    z.object({ ...incomeExpenseShape, ...dated }),
    z.object({ ...transferShape, ...dated }).refine(isDistinctTransfer, distinctTransferCheck),
  ],
  { error: validationMessage('transaction.typeInvalidHint') },
);

export const transactionUpdateSchema = z
  .object({
    type: transactionTypeSchema,
    accountId: idSchema,
    toAccountId: toAccountIdSchema,
    categoryId: categoryIdSchema,
    amount: positiveCentsSchema,
    description: descriptionSchema,
    date: localDateSchema,
    notes: notesSchema.nullable(),
  })
  .partial()
  .refine(isDistinctTransfer, distinctTransferCheck)
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: validationMessage('common.updateEmpty'),
  });

export function mergeTransactionUpdate(
  current: TransactionCreate,
  update: TransactionUpdate,
): z.ZodSafeParseResult<TransactionCreate> {
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) continue;
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return transactionCreateSchema.safeParse(merged);
}

const responseMeta = {
  id: idSchema,
  date: localDateSchema,
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
};

/** Display fields embedded in a transaction response, so lists render without extra lookups. */
export const transactionAccountRefSchema = z.object({ id: idSchema, name: z.string() });

export const transactionCategoryRefSchema = z.object({
  id: idSchema,
  name: z.string(),
  color: hexColorSchema,
  icon: iconSchema,
  systemKey: nullableSystemKeySchema,
});

/**
 * A transaction as the API returns it. Besides the ids, it carries `account`, `category` and
 * `toAccount` for display: `category` is null on transfers and `toAccount` is null on income
 * and expense.
 */
export const transactionSchema = z.discriminatedUnion('type', [
  z.object({
    ...incomeExpenseShape,
    ...responseMeta,
    account: transactionAccountRefSchema,
    category: transactionCategoryRefSchema.nullable(),
    toAccount: z.null(),
  }),
  z.object({
    ...transferShape,
    ...responseMeta,
    account: transactionAccountRefSchema,
    category: z.null(),
    toAccount: transactionAccountRefSchema,
  }),
]);

export const TRANSACTION_SORT_FIELDS = ['date', 'amount', 'description'] as const;

export const transactionFiltersSchema = z.object({
  ...paginationQuerySchema.shape,
  month: fromQuery(monthKeySchema),
  accountId: fromQuery(idSchema),
  categoryId: fromQuery(idSchema),
  type: fromQuery(transactionTypeSchema),
  search: fromQuery(z.string().trim().max(DESCRIPTION_MAX)),
  sort: sortSchema(TRANSACTION_SORT_FIELDS, { field: 'date', direction: 'desc' }),
});

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type TransactionTemplate = z.infer<typeof transactionTemplateSchema>;
export type TransactionTemplateInput = z.input<typeof transactionTemplateSchema>;
export type TransactionCreate = z.infer<typeof transactionCreateSchema>;
export type TransactionCreateInput = z.input<typeof transactionCreateSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type TransactionUpdateInput = z.input<typeof transactionUpdateSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionAccountRef = z.infer<typeof transactionAccountRefSchema>;
export type TransactionCategoryRef = z.infer<typeof transactionCategoryRefSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type TransactionFiltersInput = z.input<typeof transactionFiltersSchema>;
