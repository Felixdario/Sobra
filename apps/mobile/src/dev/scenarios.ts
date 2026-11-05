import type { FetchLike } from '@sobra/client';
import { toMonthKey, type MonthKey } from '@sobra/shared';
import { newUser, oneTransaction, worstCase, type ScenarioData } from './scenarioData';

/*
 * Dev-only data scenarios (break-ui "Dados demo / Pior caso"). The switch lives in Ajustes behind
 * `__DEV__`, and the data enters through the same boundary as the real data: the `fetch` the API
 * client uses. Screens don't know about it. Release builds never create the scenario fetch
 * (app/_layout.tsx), so the toggle and its data have no effect outside development.
 */

/** Labels: `mobile.dev.scenarios.<value>` in @sobra/i18n. */
export const SCENARIOS = ['demo', 'worst', 'empty', 'one', 'error', 'offline'] as const;

export type Scenario = (typeof SCENARIOS)[number];

const DATA: Partial<Record<Scenario, ScenarioData>> = {
  worst: worstCase,
  empty: newUser,
  one: oneTransaction,
};

let current: Scenario = 'demo';
const listeners = new Set<() => void>();

export const scenarioStore = {
  get: () => current,
  set(next: Scenario) {
    current = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

type Reply = { status: number; body?: unknown };

let created = 0;
/** UUID-shaped ids for echoed creations (Hermes has no crypto.randomUUID). */
const nextId = () => `00000000-0000-4000-9000-${(created += 1).toString(16).padStart(12, '0')}`;

const json = (body: unknown): Reply => ({ status: 200, body });

function pageOf<T>(items: T[], query: URLSearchParams) {
  const pageSize = Number(query.get('pageSize') ?? 20);
  const page = Number(query.get('page') ?? 1);
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  return {
    items: slice,
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/** GET answers for a dataset; writes succeed and echo, so flows can be walked end to end. */
export function replyFor(
  data: ScenarioData,
  method: string,
  path: string,
  query: URLSearchParams,
  body: unknown,
): Reply {
  const month = (query.get('month') ?? toMonthKey(new Date())) as MonthKey;
  if (method === 'GET') {
    if (path === '/me') return json(data.user);
    if (path === '/accounts') return json(data.accounts);
    if (path === '/categories') return json(data.categories);
    if (path === '/transactions') {
      const filtered = data.transactions.filter(
        (tx) =>
          (!query.get('month') || tx.date.startsWith(`${month}-`)) &&
          (!query.get('categoryId') ||
            (tx.type !== 'transfer' && tx.categoryId === query.get('categoryId'))) &&
          (!query.get('accountId') || tx.accountId === query.get('accountId')),
      );
      return json(pageOf(filtered, query));
    }
    if (path === '/summary/month') return json(data.summary(month));
    if (path === '/summary/spending-by-category') return json(data.spending(month));
    if (path === '/summary/budget-vs-actual') return json(data.budgets(month));
  }
  if (method === 'POST' && path === '/transactions') {
    const input = body as Record<string, unknown>;
    const template = data.transactions[0] ?? worstCase.transactions[0];
    return { status: 201, body: { ...template, ...input, id: nextId() } };
  }
  if (method === 'PATCH' && path.startsWith('/transactions/')) {
    const found = data.transactions.find((tx) => path.endsWith(tx.id));
    return json({ ...found, ...(body as object) });
  }
  if (method === 'DELETE') return { status: 204 };
  return {
    status: 404,
    body: { error: { code: 'NOT_FOUND', message: `Cenário sem dados para ${method} ${path}` } },
  };
}

const serverError: Reply = {
  status: 500,
  body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
};

/**
 * Wraps the real fetch. Auth always goes to the real API (the session stays real); everything
 * else answers from the selected scenario.
 */
export function createScenarioFetch(real: FetchLike): FetchLike {
  const scenarioFetch = async (url: string, init: { method?: string; body?: string }) => {
    const scenario = scenarioStore.get();
    const [base = '', search = ''] = url.split('?');
    const path = base.replace(/^https?:\/\/[^/]+/, '');
    if (scenario === 'demo' || path.startsWith('/auth/')) {
      return real(url, init as never);
    }
    if (scenario === 'offline') throw new TypeError('Network request failed');
    const method = init.method ?? 'GET';
    const data = DATA[scenario];
    const reply =
      scenario === 'error' || !data
        ? serverError
        : replyFor(
            data,
            method,
            path,
            new URLSearchParams(search),
            init.body && JSON.parse(init.body),
          );
    return {
      status: reply.status,
      text: async () => (reply.body === undefined ? '' : JSON.stringify(reply.body)),
    };
  };
  return scenarioFetch as unknown as FetchLike;
}
