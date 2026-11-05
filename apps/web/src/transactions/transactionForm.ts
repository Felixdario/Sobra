import { translateIssue, type Translator } from '@sobra/i18n';
import {
  toLocalDateKey,
  transactionCreateSchema,
  transactionTypeSchema,
  type Transaction,
  type TransactionCreate,
} from '@sobra/shared';
import { z } from 'zod';
import type { Format } from '../i18n/format';

/**
 * What the form edits: plain strings, as the inputs hold them. The submit runs the shared
 * `transactionCreateSchema`, so the rules are the API's own (their messages translated with
 * `translateIssue`); only the amount in the person's locale ("1.234,56" / "1,234.56") and the
 * empty selects get messages of their own.
 */
export const createTransactionFormSchema = (t: Translator, fmt: Format) =>
  z
    .object({
      type: transactionTypeSchema,
      accountId: z.string(),
      toAccountId: z.string(),
      categoryId: z.string(),
      amount: z.string(),
      description: z.string(),
      date: z.string(),
      notes: z.string(),
    })
    .transform((form, ctx): TransactionCreate => {
      const amount = fmt.parseMoney(form.amount);
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message });
      if (amount === null || amount <= 0) {
        issue(
          'amount',
          t('web.transactions.form.amountInvalid', { example: fmt.moneyInput(8_590) }),
        );
      }
      if (!form.accountId) issue('accountId', t('web.transactions.form.accountRequired'));
      if (form.type === 'transfer' && !form.toAccountId) {
        issue('toAccountId', t('web.transactions.form.toAccountRequired'));
      }
      if (form.type !== 'transfer' && !form.categoryId) {
        issue('categoryId', t('web.transactions.form.categoryRequired'));
      }

      const common = {
        accountId: form.accountId,
        amount: amount ?? 0,
        description: form.description,
        date: form.date,
        ...(form.notes.trim() ? { notes: form.notes } : {}),
      };
      const body =
        form.type === 'transfer'
          ? { ...common, type: form.type, toAccountId: form.toAccountId }
          : { ...common, type: form.type, categoryId: form.categoryId };
      const parsed = transactionCreateSchema.safeParse(body);
      if (!parsed.success) {
        const reported = new Set(['amount', 'accountId', 'toAccountId', 'categoryId']);
        for (const problem of parsed.error.issues) {
          const field = String(problem.path[0] ?? 'root');
          if (!reported.has(field)) issue(field, translateIssue(t, problem));
        }
        return z.NEVER;
      }
      return parsed.data;
    });

export type TransactionFormSchema = ReturnType<typeof createTransactionFormSchema>;
export type TransactionFormValues = z.input<TransactionFormSchema>;

export function emptyForm(
  defaults: { accountId?: string; now?: Date } = {},
): TransactionFormValues {
  return {
    type: 'expense',
    accountId: defaults.accountId ?? '',
    toAccountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: toLocalDateKey(defaults.now ?? new Date()),
    notes: '',
  };
}

export function formFromTransaction(tx: Transaction, fmt: Format): TransactionFormValues {
  return {
    type: tx.type,
    accountId: tx.accountId,
    toAccountId: tx.type === 'transfer' ? tx.toAccountId : '',
    categoryId: tx.type === 'transfer' ? '' : tx.categoryId,
    amount: fmt.moneyInput(tx.amount),
    description: tx.description,
    date: tx.date,
    notes: tx.notes ?? '',
  };
}

/** Body that recreates a deleted transaction (the "Desfazer" of the delete toast). */
export function bodyFromTransaction(tx: Transaction): TransactionCreate {
  const common = {
    accountId: tx.accountId,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    ...(tx.notes ? { notes: tx.notes } : {}),
  };
  return tx.type === 'transfer'
    ? { ...common, type: 'transfer', toAccountId: tx.toAccountId }
    : { ...common, type: tx.type, categoryId: tx.categoryId };
}
