import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/query-core';
import {
  cents,
  mergeTransactionUpdate,
  transactionCreateSchema,
  transactionUpdateSchema,
  type Account,
  type Category,
  type Transaction,
  type TransactionCreate,
} from '@sobra/shared';
import type {
  TransactionCreateBody,
  TransactionListParams,
  TransactionPage,
  TransactionUpdateBody,
} from '../types';
import { queryKeys } from './keys';

/*
 * Optimistic updates for transactions: the lists in cache (single pages and infinite pages), the
 * detail and the account balances change right away; `rollback()` restores exactly what was
 * there. The server's answer still wins: the mutations invalidate everything on settle (see
 * mutations.ts).
 */

/** Data of `queries.transactions.infinite(...)`. */
export type TransactionPages = InfiniteData<TransactionPage, number>;

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

type InfiniteEntry = [key: QueryKey, data: TransactionPages, params: TransactionListParams];

function cachedInfinite(client: QueryClient): InfiniteEntry[] {
  return client
    .getQueriesData<TransactionPages>({ queryKey: queryKeys.transactions.infinites() })
    .flatMap(([key, data]) =>
      data ? [[key, data, (key[2] ?? {}) as TransactionListParams] as InfiniteEntry] : [],
    );
}

/** Every page keeps the same `total`, so `getNextPageParam` stays right. */
function withPages(
  data: TransactionPages,
  items: (page: TransactionPage, index: number) => Transaction[],
  total: number,
): TransactionPages {
  return { ...data, pages: data.pages.map((page, i) => withTotal(page, items(page, i), total)) };
}

const totalOf = (data: TransactionPages) => data.pages[0]?.total ?? 0;

/**
 * Where a new item goes among the loaded pages. Default order: before the first item with the
 * same date or older; if every loaded item is newer, at the end of the last page when there are
 * no more pages, or nowhere when it belongs to a page not loaded yet (it comes with that page).
 * Other orders: on top of the first page, like the single-page lists.
 */
function insertionPoint(data: TransactionPages, tx: Transaction, params: TransactionListParams) {
  if (data.pages.length === 0) return null;
  if (!isDefaultSort(params)) return { page: 0, index: 0 };
  for (const [page, { items }] of data.pages.entries()) {
    const index = items.findIndex((item) => item.date <= tx.date);
    if (index !== -1) return { page, index };
  }
  const lastIndex = data.pages.length - 1;
  const last = data.pages[lastIndex] as TransactionPage;
  return last.page >= last.totalPages ? { page: lastIndex, index: last.items.length } : null;
}

function insertIntoPages(
  data: TransactionPages,
  tx: Transaction,
  params: TransactionListParams,
): TransactionPages {
  const at = insertionPoint(data, tx, params);
  return withPages(
    data,
    (page, i) =>
      i === at?.page
        ? [...page.items.slice(0, at.index), tx, ...page.items.slice(at.index)]
        : page.items,
    totalOf(data) + 1,
  );
}

function removeFromPages(data: TransactionPages, id: string): TransactionPages | null {
  if (!data.pages.some((page) => page.items.some((item) => item.id === id))) return null;
  return withPages(data, (page) => page.items.filter((item) => item.id !== id), totalOf(data) - 1);
}

function replaceInPages(data: TransactionPages, id: string, tx: Transaction): TransactionPages {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === id ? tx : item)),
    })),
  };
}

function findCached(client: QueryClient, id: string): Transaction | undefined {
  const detail = client.getQueryData<Transaction>(queryKeys.transactions.detail(id));
  if (detail) return detail;
  for (const [, page] of cachedLists(client)) {
    const found = page.items.find((item) => item.id === id);
    if (found) return found;
  }
  for (const [, data] of cachedInfinite(client)) {
    for (const page of data.pages) {
      const found = page.items.find((item) => item.id === id);
      if (found) return found;
    }
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
  for (const [key, data, params] of cachedInfinite(client)) {
    if (!matchesFilters(tx, params)) continue;
    client.setQueryData<TransactionPages>(key, insertIntoPages(data, tx, params));
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
  for (const [key, data] of cachedInfinite(client)) {
    client.setQueryData<TransactionPages>(key, replaceInPages(data, tempId, tx));
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
  for (const [key, data, params] of cachedInfinite(client)) {
    const without = removeFromPages(data, id);
    if (!without) continue;
    const moved = isDefaultSort(params) && next.date !== current.date;
    client.setQueryData<TransactionPages>(
      key,
      !matchesFilters(next, params)
        ? without
        : moved
          ? insertIntoPages(without, next, params)
          : replaceInPages(data, id, next),
    );
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
  for (const [key, data] of cachedInfinite(client)) {
    const without = removeFromPages(data, id);
    if (without) client.setQueryData<TransactionPages>(key, without);
  }
  client.removeQueries({ queryKey: queryKeys.transactions.detail(id), exact: true });
  if (current) applyBalances(client, balanceEffects(current, -1));
  return snapshot;
}
