import type { QueryClient, QueryKey } from '@tanstack/query-core';
import {
  cents,
  mergeTransactionUpdate,
  transactionCreateSchema,
  transactionUpdateSchema,
  type Account,
  type Category,
  type Transaction,
  type TransactionCreate,
} from '@financas/shared';
import type {
  TransactionCreateBody,
  TransactionListParams,
  TransactionPage,
  TransactionUpdateBody,
} from '../types';
import { queryKeys } from './keys';

/*
 * Optimistic updates for transactions: the lists in cache, the detail and the account balances
 * change right away; `rollback()` restores exactly what was there. The server's answer still
 * wins: the mutations invalidate everything on settle (see mutations.ts).
 */

export type OptimisticSnapshot = { rollback(): void };

const OPTIMISTIC_PREFIX = 'optimistic-';
let sequence = 0;

/** Ids of items created locally and not yet confirmed; the UI may disable actions on them. */
export function isOptimisticId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_PREFIX);
}

/** Cancels in-flight reads (so they don't overwrite the optimistic data) and snapshots the cache. */
async function prepare(client: QueryClient): Promise<OptimisticSnapshot> {
  const roots = [queryKeys.transactions.all(), queryKeys.accounts.all()];
  await Promise.all(roots.map((queryKey) => client.cancelQueries({ queryKey })));
  const entries = roots.flatMap((queryKey) => client.getQueriesData({ queryKey }));
  return {
    rollback: () => {
      for (const [key, data] of entries) client.setQueryData(key, data);
    },
  };
}

function cachedAccount(client: QueryClient, id: string): Account | undefined {
  for (const [, data] of client.getQueriesData<Account | Account[]>({
    queryKey: queryKeys.accounts.all(),
  })) {
    const found = Array.isArray(data) ? data.find((a) => a.id === id) : data;
    if (found?.id === id) return found;
  }
  return undefined;
}

function cachedCategory(client: QueryClient, id: string): Category | undefined {
  for (const [, data] of client.getQueriesData<Category | Category[]>({
    queryKey: queryKeys.categories.all(),
  })) {
    const found = Array.isArray(data) ? data.find((c) => c.id === id) : data;
    if (found?.id === id) return found;
  }
  return undefined;
}

function accountRef(client: QueryClient, id: string) {
  return { id, name: cachedAccount(client, id)?.name ?? '' };
}

/** A full `Transaction` for display, with the embedded refs taken from the cache. */
function toTransaction(
  client: QueryClient,
  fields: TransactionCreate,
  meta: { id: string; createdAt: string; updatedAt: string },
): Transaction {
  const common = {
    ...meta,
    accountId: fields.accountId,
    amount: fields.amount,
    description: fields.description,
    date: fields.date,
    notes: fields.notes ?? null,
    account: accountRef(client, fields.accountId),
  };
  if (fields.type === 'transfer') {
    return {
      ...common,
      type: 'transfer',
      toAccountId: fields.toAccountId,
      category: null,
      toAccount: accountRef(client, fields.toAccountId),
    };
  }
  const category = cachedCategory(client, fields.categoryId);
  return {
    ...common,
    type: fields.type,
    categoryId: fields.categoryId,
    category: category
      ? { id: category.id, name: category.name, color: category.color, icon: category.icon }
      : null,
    toAccount: null,
  };
}

function toCreateFields(tx: Transaction): TransactionCreate {
  const base = {
    accountId: tx.accountId,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    ...(tx.notes === null ? {} : { notes: tx.notes }),
  };
  return tx.type === 'transfer'
    ? { ...base, type: 'transfer', toAccountId: tx.toAccountId }
    : { ...base, type: tx.type, categoryId: tx.categoryId };
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Client-side mirror of the API filters, to decide whether a list shows a transaction. */
export function matchesFilters(tx: Transaction, params: TransactionListParams): boolean {
  if (params.month && !tx.date.startsWith(`${params.month}-`)) return false;
  if (params.type && tx.type !== params.type) return false;
  if (params.categoryId && (tx.type === 'transfer' || tx.categoryId !== params.categoryId)) {
    return false;
  }
  if (
    params.accountId &&
    tx.accountId !== params.accountId &&
    !(tx.type === 'transfer' && tx.toAccountId === params.accountId)
  ) {
    return false;
  }
  if (params.search) {
    const term = normalize(params.search.trim());
    const haystack = normalize(`${tx.description} ${tx.notes ?? ''}`);
    if (!haystack.includes(term)) return false;
  }
  return true;
}

type ListEntry = [key: QueryKey, page: TransactionPage, params: TransactionListParams];

function cachedLists(client: QueryClient): ListEntry[] {
  return client
    .getQueriesData<TransactionPage>({ queryKey: queryKeys.transactions.lists() })
    .flatMap(([key, page]) =>
      page ? [[key, page, (key[2] ?? {}) as TransactionListParams] as ListEntry] : [],
    );
}

function withTotal(page: TransactionPage, items: Transaction[], total: number): TransactionPage {
  return { ...page, items, total, totalPages: Math.ceil(total / page.pageSize) };
}

const isDefaultSort = (params: TransactionListParams) =>
  params.sort === undefined || params.sort === 'date' || params.sort === 'date:desc';

/** New item on the first page: by date in the default order (newest first), on top otherwise. */
function insertIntoPage(page: TransactionPage, tx: Transaction, params: TransactionListParams) {
  const items = [...page.items];
  let index = 0;
  if (isDefaultSort(params)) {
    index = items.findIndex((item) => item.date <= tx.date);
    if (index === -1) index = items.length;
  }
  items.splice(index, 0, tx);
  if (items.length > page.pageSize) items.pop();
  return withTotal(page, items, page.total + 1);
}

function findCached(client: QueryClient, id: string): Transaction | undefined {
  const detail = client.getQueryData<Transaction>(queryKeys.transactions.detail(id));
  if (detail) return detail;
  for (const [, page] of cachedLists(client)) {
    const found = page.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Balance change per account caused by a transaction (`sign` −1 undoes it). */
function balanceEffects(tx: Transaction, sign: 1 | -1): Map<string, number> {
  const effects = new Map<string, number>();
  const add = (accountId: string, value: number) =>
    effects.set(accountId, (effects.get(accountId) ?? 0) + value * sign);
  if (tx.type === 'transfer') {
    add(tx.accountId, -tx.amount);
    add(tx.toAccountId, tx.amount);
  } else {
    add(tx.accountId, tx.type === 'income' ? tx.amount : -tx.amount);
  }
  return effects;
}

function applyBalances(client: QueryClient, ...effectsList: Map<string, number>[]) {
  const total = new Map<string, number>();
  for (const effects of effectsList) {
    for (const [id, value] of effects) total.set(id, (total.get(id) ?? 0) + value);
  }
  if ([...total.values()].every((value) => value === 0)) return;
  const update = (account: Account): Account => {
    const delta = total.get(account.id);
    return delta ? { ...account, balance: cents(account.balance + delta) } : account;
  };
  for (const [key, data] of client.getQueriesData<Account | Account[]>({
    queryKey: queryKeys.accounts.all(),
  })) {
    if (data === undefined) continue;
    client.setQueryData(key, Array.isArray(data) ? data.map(update) : update(data));
  }
}

/** Shows a new transaction at once. Returns the temporary id and the rollback. */
export async function optimisticCreateTransaction(
  client: QueryClient,
  body: TransactionCreateBody,
): Promise<OptimisticSnapshot & { tempId: string | null }> {
  const snapshot = await prepare(client);
  const parsed = transactionCreateSchema.safeParse(body);
  // Invalid input: the API will answer 400; there is nothing sensible to show meanwhile.
  if (!parsed.success) return { ...snapshot, tempId: null };

  const now = new Date().toISOString();
  sequence += 1;
  const tempId = `${OPTIMISTIC_PREFIX}${sequence}`;
  const tx = toTransaction(client, parsed.data, { id: tempId, createdAt: now, updatedAt: now });

  for (const [key, page, params] of cachedLists(client)) {
    if (!matchesFilters(tx, params)) continue;
    const onFirstPage = (params.page ?? 1) === 1;
    client.setQueryData<TransactionPage>(
      key,
      onFirstPage ? insertIntoPage(page, tx, params) : withTotal(page, page.items, page.total + 1),
    );
  }
  applyBalances(client, balanceEffects(tx, 1));
  return { ...snapshot, tempId };
}

/** Swaps the temporary item for the server's, so follow-up actions use the real id. */
export function confirmCreatedTransaction(client: QueryClient, tempId: string, tx: Transaction) {
  for (const [key, page] of cachedLists(client)) {
    if (!page.items.some((item) => item.id === tempId)) continue;
    client.setQueryData<TransactionPage>(key, {
      ...page,
      items: page.items.map((item) => (item.id === tempId ? tx : item)),
    });
  }
  client.setQueryData(queryKeys.transactions.detail(tx.id), tx);
}

/** Applies an edit at once (lists, detail, balances). */
export async function optimisticUpdateTransaction(
  client: QueryClient,
  id: string,
  body: TransactionUpdateBody,
): Promise<OptimisticSnapshot> {
  const snapshot = await prepare(client);
  const current = findCached(client, id);
  const patch = transactionUpdateSchema.safeParse(body);
  if (!current || !patch.success) return snapshot;
  const merged = mergeTransactionUpdate(toCreateFields(current), patch.data);
  if (!merged.success) return snapshot;

  const next = toTransaction(client, merged.data, {
    id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });

  for (const [key, page, params] of cachedLists(client)) {
    const index = page.items.findIndex((item) => item.id === id);
    if (index === -1) continue;
    const items = [...page.items];
    if (matchesFilters(next, params)) {
      items[index] = next;
      client.setQueryData<TransactionPage>(key, { ...page, items });
    } else {
      items.splice(index, 1);
      client.setQueryData<TransactionPage>(key, withTotal(page, items, page.total - 1));
    }
  }
  if (client.getQueryData(queryKeys.transactions.detail(id))) {
    client.setQueryData(queryKeys.transactions.detail(id), next);
  }
  applyBalances(client, balanceEffects(current, -1), balanceEffects(next, 1));
  return snapshot;
}

/** Removes a transaction at once (swipe to delete). */
export async function optimisticRemoveTransaction(
  client: QueryClient,
  id: string,
): Promise<OptimisticSnapshot> {
  const snapshot = await prepare(client);
  const current = findCached(client, id);

  for (const [key, page] of cachedLists(client)) {
    const items = page.items.filter((item) => item.id !== id);
    if (items.length === page.items.length) continue;
    client.setQueryData<TransactionPage>(key, withTotal(page, items, page.total - 1));
  }
  client.removeQueries({ queryKey: queryKeys.transactions.detail(id), exact: true });
  if (current) applyBalances(client, balanceEffects(current, -1));
  return snapshot;
}
