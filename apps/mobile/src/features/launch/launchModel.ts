import type { TransactionCreateBody, TransactionUpdateBody } from '@sobra/client';
import { cents, type Account, type Category, type Transaction } from '@sobra/shared';

export type LaunchType = 'expense' | 'income';

/** Most used first (recent transactions of the same kind), ties by name. */
export function rankCategories(
  categories: readonly Category[],
  recent: readonly Transaction[],
  type: LaunchType,
): Category[] {
  const uses = new Map<string, number>();
  for (const tx of recent) {
    if (tx.type !== 'transfer' && tx.type === type)
      uses.set(tx.categoryId, (uses.get(tx.categoryId) ?? 0) + 1);
  }
  return categories
    .filter((category) => category.kind === type)
    .sort(
      (a, b) =>
        (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
    );
}

/**
 * The account a launch goes to unless the user changes it: the last one used in this app, else
 * the account of the most recent transaction, else the first checking account, else any.
 */
export function pickDefaultAccount(
  accounts: readonly Account[],
  recent: readonly Transaction[],
  lastUsedId: string | null,
): Account | null {
  const active = accounts.filter((account) => !account.archived);
  const byId = (id: string | null | undefined) => active.find((account) => account.id === id);
  return (
    byId(lastUsedId) ??
    byId(recent[0]?.accountId) ??
    active.find((account) => account.type === 'checking') ??
    active[0] ??
    null
  );
}

export type LaunchDraft = {
  type: LaunchType;
  amount: number;
  categoryId: string | null;
  accountId: string | null;
  date: string;
  description: string;
  notes: string;
  /** Set when the sheet edits an existing transaction instead of creating one. */
  editing: Transaction | null;
};

export function emptyDraft(type: LaunchType, date: string): LaunchDraft {
  return {
    type,
    amount: 0,
    categoryId: null,
    accountId: null,
    date,
    description: '',
    notes: '',
    editing: null,
  };
}

/** Edit mode starts from the transaction as it is. Transfers keep their own type and accounts. */
export function draftFromTransaction(tx: Transaction): LaunchDraft {
  return {
    type: tx.type === 'income' ? 'income' : 'expense',
    amount: tx.amount,
    categoryId: tx.type === 'transfer' ? null : tx.categoryId,
    accountId: tx.accountId,
    date: tx.date,
    description: tx.description,
    notes: tx.notes ?? '',
    editing: tx,
  };
}

/** PATCH body for edit mode, or null while something required is missing. */
export function buildUpdate(
  draft: LaunchDraft,
  categories: readonly Category[],
): TransactionUpdateBody | null {
  const tx = draft.editing;
  if (!tx || draft.amount <= 0) return null;
  const notes = draft.notes.trim() || null;
  if (tx.type === 'transfer') {
    return {
      amount: cents(draft.amount),
      date: draft.date,
      description: draft.description.trim() || tx.description,
      notes,
    };
  }
  const category = categories.find((item) => item.id === draft.categoryId);
  if (!category || !draft.accountId) return null;
  return {
    type: draft.type,
    accountId: draft.accountId,
    categoryId: category.id,
    amount: cents(draft.amount),
    date: draft.date,
    description: draft.description.trim() || category.name,
    notes,
  };
}

/** The request body, or null while something required is missing. */
export function buildPayload(
  draft: LaunchDraft,
  categories: readonly Category[],
): TransactionCreateBody | null {
  const category = categories.find((item) => item.id === draft.categoryId);
  if (draft.amount <= 0 || !category || !draft.accountId) return null;
  return {
    type: draft.type,
    accountId: draft.accountId,
    categoryId: category.id,
    amount: cents(draft.amount),
    description: draft.description.trim() || category.name,
    date: draft.date,
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
  };
}
