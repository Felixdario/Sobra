import { z } from 'zod';
import {
  fromQuery,
  idSchema,
  isoDateTimeSchema,
  localDateSchema,
  monthKeySchema,
  paginationQuerySchema,
  positiveCentsSchema,
  sortSchema,
} from './common';

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES, {
  error: 'Tipo de transação inválido',
});

export const DESCRIPTION_MAX = 120;
export const NOTES_MAX = 500;

const descriptionSchema = z
  .string({ error: 'Informe a descrição' })
  .trim()
  .min(1, { error: 'Informe a descrição' })
  .max(DESCRIPTION_MAX, {
    error: `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres`,
  });

const notesSchema = z
  .string()
  .trim()
  .max(NOTES_MAX, { error: `As observações devem ter no máximo ${NOTES_MAX} caracteres` });

const categoryIdSchema = z.uuid({ error: 'Informe uma categoria válida' });
const toAccountIdSchema = z.uuid({ error: 'Informe uma conta de destino válida' });

const SAME_ACCOUNT_MESSAGE = 'A conta de destino deve ser diferente da conta de origem';

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
  error: SAME_ACCOUNT_MESSAGE,
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
  type: z.enum(['income', 'expense'], { error: 'Tipo de transação inválido' }),
  categoryId: categoryIdSchema,
};

const transferShape = {
  ...baseShape,
  type: z.literal('transfer', { error: 'Tipo de transação inválido' }),
  toAccountId: toAccountIdSchema,
};

export const transactionTemplateSchema = z.discriminatedUnion(
  'type',
  [
    z.object(incomeExpenseShape),
    z.object(transferShape).refine(isDistinctTransfer, distinctTransferCheck),
  ],
  { error: 'Tipo de transação inválido: use income, expense ou transfer' },
);

const dated = { date: localDateSchema };

export const transactionCreateSchema = z.discriminatedUnion(
  'type',
  [
    z.object({ ...incomeExpenseShape, ...dated }),
    z.object({ ...transferShape, ...dated }).refine(isDistinctTransfer, distinctTransferCheck),
  ],
  { error: 'Tipo de transação inválido: use income, expense ou transfer' },
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
    error: 'Informe ao menos um campo para atualizar',
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

export const transactionSchema = z.discriminatedUnion('type', [
  z.object({ ...incomeExpenseShape, ...responseMeta }),
  z.object({ ...transferShape, ...responseMeta }),
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
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type TransactionFiltersInput = z.input<typeof transactionFiltersSchema>;
