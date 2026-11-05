import type { FakeReply, FakeRoutes } from './fakeApi';
import { tokens, user } from './fakeApi';

const NOW = '2026-11-04T12:00:00.000Z';
const uuid = (n: number) => `0198f1c2-0000-7000-8000-${String(n).padStart(12, '0')}`;

export const ids = {
  nubank: uuid(101),
  cartao: uuid(102),
  carteira: uuid(103),
  mercado: uuid(201),
  salario: uuid(202),
  lazer: uuid(203),
  tx1: uuid(301),
  tx2: uuid(302),
  tx3: uuid(303),
  budgetMercado: uuid(401),
  batch: uuid(501),
};

export const ok = (body: unknown): FakeReply => ({ status: 200, body });
export const apiError = (status: number, code: string, message: string): FakeReply => ({
  status,
  body: { error: { code, message } },
});

export const account = (
  id: string,
  name: string,
  balance: number,
  type: 'checking' | 'credit_card' | 'cash' = 'checking',
) => ({
  id,
  name,
  type,
  initialBalance: 0,
  balance,
  color: '#3A64C8',
  icon: type === 'credit_card' ? 'credit-card' : 'landmark',
  archived: false,
  createdAt: NOW,
  updatedAt: NOW,
});

export const accounts = [
  account(ids.nubank, 'Nubank', 686_313),
  account(ids.cartao, 'Cartão Inter', -289_180, 'credit_card'),
  account(ids.carteira, 'Carteira', 55_365, 'cash'),
];

export const category = (id: string, name: string, kind: 'income' | 'expense', icon = 'cart') => ({
  id,
  name,
  kind,
  color: '#D06A1F',
  icon,
  createdAt: NOW,
  updatedAt: NOW,
});

export const categories = [
  category(ids.mercado, 'Mercado', 'expense'),
  category(ids.lazer, 'Lazer', 'expense', 'film'),
  category(ids.salario, 'Salário', 'income', 'briefcase'),
];

const ref = (id: string) => accounts.find((a) => a.id === id)!;

export const expense = (id: string, description: string, amount: number, date = '2026-10-18') => ({
  id,
  type: 'expense' as const,
  accountId: ids.nubank,
  categoryId: ids.mercado,
  amount,
  description,
  date,
  notes: null,
  createdAt: NOW,
  updatedAt: NOW,
  account: { id: ids.nubank, name: 'Nubank' },
  category: { id: ids.mercado, name: 'Mercado', color: '#D06A1F', icon: 'cart' },
  toAccount: null,
});

export const transfer = (id: string, amount: number) => ({
  id,
  type: 'transfer' as const,
  accountId: ids.nubank,
  toAccountId: ids.carteira,
  amount,
  description: 'Saque',
  date: '2026-10-08',
  notes: null,
  createdAt: NOW,
  updatedAt: NOW,
  account: { id: ids.nubank, name: ref(ids.nubank).name },
  category: null,
  toAccount: { id: ids.carteira, name: ref(ids.carteira).name },
});

export const income = (id: string) => ({
  ...expense(id, 'Salário — Acme', 680_000, '2026-10-07'),
  type: 'income' as const,
  categoryId: ids.salario,
  category: { id: ids.salario, name: 'Salário', color: '#2E8B57', icon: 'briefcase' },
});

export const page = (items: unknown[], { page = 1, pageSize = 20, total = items.length } = {}) => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

/** Session + reference data every management screen reads. */
export function baseRoutes(): FakeRoutes {
  return {
    'POST /auth/refresh': () => ok(tokens),
    'GET /me': () => ok(user),
    'GET /accounts': () => ok(accounts),
    'GET /categories': ({ query }) =>
      ok(query.get('kind') ? categories.filter((c) => c.kind === query.get('kind')) : categories),
  };
}
