import type { FetchLike } from '@sobra/client';
import type {
  balanceHistorySchema,
  budgetVsActualSchema,
  incomeVsExpenseSeriesSchema,
  MonthSummaryInput,
  spendingByCategorySchema,
} from '@sobra/shared';
import type { z } from 'zod';

type SpendingByCategory = z.input<typeof spendingByCategorySchema>;
type IncomeVsExpenseSeries = z.input<typeof incomeVsExpenseSeriesSchema>;
type BalanceHistory = z.input<typeof balanceHistorySchema>;
type BudgetVsActual = z.input<typeof budgetVsActualSchema>;

export const BASE_URL = 'http://api.test';

export type FakeRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  credentials: string | undefined;
  body: unknown;
};
export type FakeReply = { status: number; body?: unknown };
export type FakeHandler = (request: FakeRequest) => FakeReply | Promise<FakeReply>;
export type FakeRoutes = Record<string, FakeHandler>;

/**
 * A `fetch` double keyed by "METHOD /path" (or one handler for every request); unknown routes
 * answer 404 in the API's format. A handler that throws plays a network failure.
 */
export function createFakeApi(routes: FakeRoutes | FakeHandler) {
  const requests: FakeRequest[] = [];
  const fetch = async (
    url: string,
    init: { method: string; headers: Record<string, string>; credentials?: string; body?: string },
  ) => {
    const parsed = new URL(url);
    const request: FakeRequest = {
      method: init.method,
      path: parsed.pathname,
      query: parsed.searchParams,
      headers: init.headers,
      credentials: init.credentials,
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    const handler =
      typeof routes === 'function' ? routes : routes[`${request.method} ${request.path}`];
    const reply = handler
      ? await handler(request)
      : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Não encontrado' } } };
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return { status: reply.status, text: async () => text };
  };
  return { fetch: fetch as unknown as FetchLike, requests };
}

export const ids = {
  user: '0198f1c2-0000-7000-8000-000000000001',
  moradia: '0198f1c2-0000-7000-8000-0000000000c1',
  lazer: '0198f1c2-0000-7000-8000-0000000000c2',
  mercado: '0198f1c2-0000-7000-8000-0000000000c3',
};

export const user = {
  id: ids.user,
  name: 'Ana Demo',
  email: 'demo@sobra.dev',
  createdAt: '2026-05-01T12:00:00.000Z',
};

/** What the API answers the web (X-Sobra-Client: web): the refresh token is only in the cookie. */
export const tokens = { accessToken: 'access-1', expiresIn: 900 };

/**
 * Plays the browser storing the session cookies the API sets. jsdom cannot hold the httpOnly
 * refresh cookie the way a browser does (and the page never reads it), so only the readable CSRF
 * cookie is set.
 */
export function setSessionCookie(csrf = 'csrf-1') {
  document.cookie = `sobra_csrf=${csrf}; Path=/`;
}

export const october: MonthSummaryInput = {
  month: '2026-10',
  income: 769_899,
  expense: 692_909,
  balance: 1_604_043,
  savingsRate: 10.000012988716701,
  previous: { month: '2026-09', income: 800_149, expense: 640_119, balance: 1_527_053 },
  delta: {
    income: { absolute: -30_250, percent: -3.78 },
    expense: { absolute: 52_790, percent: 8.25 },
    balance: { absolute: 76_990, percent: 5.04 },
  },
};

/** Day 4 of November: only the savings yield came in, so the raw rate is −325%. */
export const novemberPartial: MonthSummaryInput = {
  month: '2026-11',
  income: 6_189,
  expense: 26_316,
  balance: 1_583_916,
  savingsRate: -325.2060106640814,
  previous: { month: '2026-10', income: 769_899, expense: 692_909, balance: 1_604_043 },
  delta: {
    income: { absolute: -763_710, percent: -99.2 },
    expense: { absolute: -666_593, percent: -96.2 },
    balance: { absolute: -20_127, percent: -1.25 },
  },
};

export const emptyMonth = (month: string, previous: string): MonthSummaryInput => ({
  month,
  income: 0,
  expense: 0,
  balance: 1_050_000,
  savingsRate: null,
  previous: { month: previous, income: 0, expense: 0, balance: 1_050_000 },
  delta: {
    income: { absolute: 0, percent: null },
    expense: { absolute: 0, percent: null },
    balance: { absolute: 0, percent: 0 },
  },
});

export const spending = (month: string): SpendingByCategory => ({
  month,
  total: 692_909,
  items: [
    {
      categoryId: ids.moradia,
      name: 'Moradia',
      color: '#8B5CF6',
      icon: 'home',
      amount: 255_256,
      percent: 36.8,
    },
    {
      categoryId: ids.lazer,
      name: 'Lazer',
      color: '#EC4899',
      icon: 'film',
      amount: 160_153,
      percent: 23.1,
    },
    {
      categoryId: ids.mercado,
      name: 'Mercado',
      color: '#F97316',
      icon: 'cart',
      amount: 277_500,
      percent: 40.1,
    },
  ],
});

export const history: IncomeVsExpenseSeries = {
  points: [
    { month: '2026-09', income: 800_149, expense: 640_119, net: 160_030 },
    { month: '2026-10', income: 769_899, expense: 692_909, net: 76_990 },
  ],
};

export const balance: BalanceHistory = {
  granularity: 'day',
  points: [
    { date: '2026-10-01', balance: 1_527_053 },
    { date: '2026-10-31', balance: 1_604_043 },
  ],
};

export const budgets = (month: string): BudgetVsActual => ({
  month,
  items: [
    {
      categoryId: ids.lazer,
      name: 'Lazer',
      color: '#EC4899',
      budgeted: 30_000,
      actual: 160_153,
      remaining: -130_153,
      percentUsed: 533.8,
    },
    {
      categoryId: ids.mercado,
      name: 'Mercado',
      color: '#F97316',
      budgeted: 120_000,
      actual: 50_000,
      remaining: 70_000,
      percentUsed: 41.7,
    },
  ],
  totals: { budgeted: 150_000, actual: 210_153, remaining: -60_153 },
});

const ok = (body: unknown): FakeReply => ({ status: 200, body });

/** A signed-in demo user with every dashboard read answering from the fixtures above. */
export function dashboardRoutes(
  summaries: Record<string, MonthSummaryInput> = { '2026-10': october, '2026-11': novemberPartial },
): FakeRoutes {
  return {
    'POST /auth/refresh': () => ok(tokens),
    'GET /me': () => ok(user),
    'GET /summary/month': ({ query }) => {
      const summary = summaries[query.get('month') ?? ''];
      return summary
        ? ok(summary)
        : { status: 500, body: { error: { code: 'INTERNAL', message: 'Erro interno' } } };
    },
    'GET /summary/spending-by-category': ({ query }) => ok(spending(query.get('month') ?? '')),
    'GET /summary/income-vs-expense': () => ok(history),
    'GET /summary/balance-history': () => ok(balance),
    'GET /summary/budget-vs-actual': ({ query }) => ok(budgets(query.get('month') ?? '')),
  };
}
