import type { Account, Category, TokenPair, Transaction, User } from '@sobra/shared';
import { cents } from '@sobra/shared';
import type { FetchFn, FetchRequestInit } from '../runtime';

export type FakeRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: unknown;
  signal: FetchRequestInit['signal'];
  credentials: FetchRequestInit['credentials'];
};

export type FakeReply = { status: number; body?: unknown };

export type FakeHandler = (request: FakeRequest) => FakeReply | Promise<FakeReply>;

/** `fetch` double: no network. Records every request; the handler decides the reply. */
export function createFakeFetch(handler: FakeHandler) {
  const requests: FakeRequest[] = [];
  const fetch: FetchFn = async (url, init) => {
    const parsed = new URL(url);
    const request: FakeRequest = {
      method: init.method,
      path: parsed.pathname,
      query: parsed.searchParams,
      headers: init.headers,
      body: init.body === undefined ? undefined : JSON.parse(init.body),
      signal: init.signal,
      credentials: init.credentials,
    };
    requests.push(request);
    const reply = await handler(request);
    const text =
      reply.body === undefined
        ? ''
        : typeof reply.body === 'string'
          ? reply.body
          : JSON.stringify(reply.body);
    return { status: reply.status, text: async () => text };
  };
  const count = (method: string, path: string) =>
    requests.filter((r) => r.method === method && r.path === path).length;
  return { fetch, requests, count };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const BASE_URL = 'http://api.test';

export const ids = {
  user: '0198f1c2-0000-7000-8000-000000000001',
  nubank: '0198f1c2-0000-7000-8000-0000000000a1',
  poupanca: '0198f1c2-0000-7000-8000-0000000000a2',
  mercado: '0198f1c2-0000-7000-8000-0000000000c1',
  salario: '0198f1c2-0000-7000-8000-0000000000c2',
  tx1: '0198f1c2-0000-7000-8000-0000000000f1',
  tx2: '0198f1c2-0000-7000-8000-0000000000f2',
  tx3: '0198f1c2-0000-7000-8000-0000000000f3',
};

export const NOW = '2026-11-04T12:00:00.000Z';

export const tokens = (n: number): TokenPair => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  expiresIn: 900,
});

export const user: User = {
  id: ids.user,
  name: 'Ana Demo',
  email: 'demo@sobra.dev',
  locale: 'pt-BR',
  currency: 'BRL',
  createdAt: NOW,
};

export const account = (id: string, name: string, balance: number): Account => ({
  id,
  name,
  type: 'checking',
  initialBalance: cents(0),
  balance: cents(balance),
  color: '#1C50B5',
  icon: 'wallet',
  archived: false,
  createdAt: NOW,
  updatedAt: NOW,
});

export const category: Category = {
  id: ids.mercado,
  name: 'Mercado',
  kind: 'expense',
  color: '#1C50B5',
  icon: 'cart',
  systemKey: 'groceries',
  createdAt: NOW,
  updatedAt: NOW,
};

export const expense = (
  id: string,
  date: string,
  amount: number,
  description = 'Mercado',
): Transaction => ({
  id,
  type: 'expense',
  accountId: ids.nubank,
  categoryId: ids.mercado,
  amount: cents(amount),
  description,
  date,
  notes: null,
  createdAt: NOW,
  updatedAt: NOW,
  account: { id: ids.nubank, name: 'Nubank' },
  category: {
    id: ids.mercado,
    name: 'Mercado',
    color: '#1C50B5',
    icon: 'cart',
    systemKey: 'groceries',
  },
  toAccount: null,
});

export const page = (items: Transaction[], pageSize = 20) => ({
  items,
  page: 1,
  pageSize,
  total: items.length,
  totalPages: Math.ceil(items.length / pageSize),
});
