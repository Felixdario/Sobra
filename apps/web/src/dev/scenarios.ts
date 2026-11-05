/**
 * Data scenarios that enter the app through the same boundary the real API does (the `fetch`
 * given to the client), never through the components. Used by the dev-only data switch
 * (`DevDataSwitch`, `import.meta.env.DEV`) and by the regression tests (`worstCase.test.tsx`).
 *
 * The worst case is plausible or schema-backed: descriptions use the 120-char limit of
 * `DESCRIPTION_MAX`; account and category names in the response contract are unbounded
 * (`z.string()`), so they get 120 chars too even though the forms cap them at 60/40 (an import
 * or an older row can still carry them). Money goes to R$ 1 bilhão and −R$ 999.999.999,99.
 */
import type { FakeReply, FakeRequest } from '../test/fakeApi';

export const SCENARIOS = ['pior', 'novo', 'uma', 'sem-rede', 'erro-500'] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCENARIO_LABELS: Record<Scenario | 'demo', string> = {
  demo: 'Dados demo',
  pior: 'Pior caso',
  novo: 'Usuário novo',
  uma: 'Uma transação',
  'sem-rede': 'Sem rede',
  'erro-500': 'Erro 500',
};

export type ScenarioHandler = (request: FakeRequest) => FakeReply;

const NOW = '2026-11-04T12:00:00.000Z';
const uuid = (group: number, n: number) =>
  `0198f1c2-0000-7000-${String(8000 + group)}-${String(n).padStart(12, '0')}`;

/** R$ 1.000.000.000,00 and −R$ 999.999.999,99, in cents. */
export const BILLION = 100_000_000_000;
export const ALMOST_BILLION = 99_999_999_999;

/** 120 characters each: the longest description the API accepts, in shapes people really type. */
export const LONG_TEXT =
  'Conta Corrente Banco do Brasil — Agência 1234-5, Ag. Centro Histórico de São João del-Rei (conjunta com Maria José F.)';
export const LONG_WORD =
  'NubankUltravioletaMetalCartãoDeCréditoInternacionalSemAnuidadeContaPrincipalDaFamíliaSilvaSantosOliveiraPereiraCostaLim';
const LONG_DESCRIPTION =
  'Pagamento parcelado 12/12 da reforma do apartamento — pintura, elétrica, hidráulica e marcenaria (orçamento revisado v3)';
const LONG_URL =
  'pix-recebido-de-bartholomew.fitzgerald@northwind-industries-holdings.example.com.br/comprovante/2026/11/04/e2e-8f3a9c1';

/** 500 characters: `NOTES_MAX`. */
const LONG_NOTES = `${LONG_URL} ${LONG_DESCRIPTION} ${LONG_TEXT} ${LONG_WORD} `
  .repeat(2)
  .slice(0, 500);

const user = (name: string) => ({
  id: uuid(0, 1),
  name,
  email: 'aleksandra.wisniewska-kowalczyk@northwind-industries-holdings.example.com',
  createdAt: '2026-05-01T12:00:00.000Z',
});
const tokens = { accessToken: 'dev-access', expiresIn: 900 };

type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash';
const account = (
  n: number,
  name: string,
  balance: number,
  type: AccountType = 'checking',
  extra: { archived?: boolean; color?: string; icon?: string } = {},
) => ({
  id: uuid(1, n),
  name,
  type,
  initialBalance: 0,
  balance,
  color: extra.color ?? '#3A64C8',
  icon: extra.icon ?? (type === 'credit_card' ? 'credit-card' : 'landmark'),
  archived: extra.archived ?? false,
  createdAt: NOW,
  updatedAt: NOW,
});

const category = (
  n: number,
  name: string,
  kind: 'income' | 'expense',
  color: string,
  icon: string,
) => ({
  id: uuid(2, n),
  name,
  kind,
  color,
  icon,
  createdAt: NOW,
  updatedAt: NOW,
});

type Account = ReturnType<typeof account>;
type Category = ReturnType<typeof category>;

const ref = (a: Account) => ({ id: a.id, name: a.name });
const catRef = (c: Category) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon });

function transaction(
  n: number,
  type: 'income' | 'expense',
  description: string,
  amount: number,
  date: string,
  acc: Account,
  cat: Category,
  notes: string | null = null,
) {
  return {
    id: uuid(3, n),
    type,
    accountId: acc.id,
    categoryId: cat.id,
    amount,
    description,
    date,
    notes,
    createdAt: NOW,
    updatedAt: NOW,
    account: ref(acc),
    category: catRef(cat),
    toAccount: null,
  };
}

function transfer(
  n: number,
  description: string,
  amount: number,
  date: string,
  from: Account,
  to: Account,
) {
  return {
    id: uuid(3, n),
    type: 'transfer' as const,
    accountId: from.id,
    toAccountId: to.id,
    amount,
    description,
    date,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    account: ref(from),
    category: null,
    toAccount: ref(to),
  };
}

type Transaction = ReturnType<typeof transaction> | ReturnType<typeof transfer>;

type Dataset = {
  userName: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  /** Total rows the list claims to have (the page is filled by repeating the crafted rows). */
  transactionTotal: number;
  summary: (month: string) => unknown;
  spending: (month: string) => unknown;
  history: (from: string, to: string) => unknown;
  balance: unknown;
  budgetVsActual: (month: string) => unknown;
  budgets: (month: string) => unknown;
  imports: unknown[];
};

const previousMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = to;
  while (cursor >= from && out.length < 24) {
    out.unshift(cursor);
    cursor = previousMonth(cursor);
  }
  return out;
}

const zeroDelta = { absolute: 0, percent: null };

function emptySummary(month: string, balance = 0) {
  return {
    month,
    income: 0,
    expense: 0,
    balance,
    savingsRate: null,
    previous: { month: previousMonth(month), income: 0, expense: 0, balance },
    delta: { income: zeroDelta, expense: zeroDelta, balance: { absolute: 0, percent: 0 } },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Pior caso                                                                                  */
/* ------------------------------------------------------------------------------------------ */

function worstDataset(): Dataset {
  const accounts = [
    account(1, LONG_TEXT, BILLION),
    account(2, LONG_WORD, -ALMOST_BILLION, 'credit_card', { color: '#B54076' }),
    account(3, 'Wise 💶 Conta em euro — Lisboa, Portugal', 1, 'savings', { color: '#2E8FBF' }),
    account(4, '東京三菱UFJ銀行 普通預金', 0, 'checking', { color: '#79821D' }),
    account(5, 'C', -1, 'cash', { color: '#6B6B66', icon: 'wallet' }),
    account(6, `${LONG_TEXT.slice(0, 80)} (encerrada)`, 0, 'checking', { archived: true }),
  ];
  const [a1, a2, a3, a4, a5] = accounts as [Account, Account, Account, Account, Account];

  const expenseNames: [string, string, string][] = [
    [LONG_TEXT.replace('Conta Corrente', 'Despesas da'), '#3A64C8', 'home'],
    [LONG_WORD, '#D06A1F', 'cart'],
    ['Saúde & Farmácia 💊', '#9B6FD0', 'heart-pulse'],
    ['育児・教育費', '#8A4FA8', 'baby'],
    ['Transporte (Uber/99/ônibus/metrô/trem/barca)', '#1F7A80', 'car'],
    ['Restaurantes', '#B4532A', 'utensils'],
    ['Lazer', '#B54076', 'film'],
    ['Educação', '#8A4FA8', 'graduation-cap'],
    ['Assinaturas', '#B28A00', 'wifi'],
    ['Compras', '#A0785A', 'shirt'],
    ['Pet', '#79821D', 'paw'],
    ['Academia', '#2E8B57', 'dumbbell'],
    ['Café', '#6B6B66', 'coffee'],
    ['Presentes', '#2E8FBF', 'gift'],
    ['X', '#D06A1F', 'sparkles'],
  ];
  const expenses = expenseNames.map(([name, color, icon], i) =>
    category(i + 1, name, 'expense', color, icon),
  );
  const incomes = [
    category(50, 'Salário', 'income', '#2E8B57', 'briefcase'),
    category(51, `Rendimentos ${LONG_WORD.slice(0, 60)}`, 'income', '#79821D', 'trending-up'),
  ];
  const categories = [...expenses, ...incomes];
  const [c1, c2, c3, c4] = expenses as [Category, Category, Category, Category];
  const [salario, rendimentos] = incomes as [Category, Category];

  const transactions: Transaction[] = [
    transaction(1, 'income', LONG_DESCRIPTION, BILLION, '2026-11-04', a1, salario, LONG_NOTES),
    transaction(2, 'expense', LONG_WORD, ALMOST_BILLION, '2026-11-04', a2, c2),
    transaction(3, 'expense', 'Farmácia São João 💊🩹 — remédios da vó', 1, '2026-11-03', a3, c3),
    transfer(4, LONG_TEXT, BILLION, '2026-11-03', a1, a2),
    transaction(5, 'expense', '幼稚園の月謝（11月分）', 4_500_000, '2026-11-02', a4, c4),
    transaction(6, 'expense', 'Pão', 850, '2026-11-02', a5, c1),
    transaction(7, 'income', LONG_URL, 12_345_678_901, '2026-11-01', a3, rendimentos),
    transaction(8, 'expense', LONG_DESCRIPTION, 100_000_000, '2026-11-01', a1, c1),
  ];

  const spendingItems = expenses.map((c, i) => ({
    categoryId: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    // Decreasing amounts summing to 199.999.999,99 so the ruler overflows by −999.999.999,99.
    amount: i === 0 ? 100_000_000_000 : i === 1 ? ALMOST_BILLION - 13 * 1_000 : 1_000,
    percent: i === 0 ? 50 : i === 1 ? 49.99 : 0,
  }));
  const expenseTotal = spendingItems.reduce((sum, item) => sum + item.amount, 0);

  const budgetRows = [
    { cat: c1, budgeted: BILLION, actual: ALMOST_BILLION },
    { cat: c2, budgeted: 10_000, actual: 100_000 }, // 1000%
    { cat: c3, budgeted: 50_000, actual: 0 }, // 0 gasto
    { cat: c4, budgeted: 1, actual: ALMOST_BILLION },
    ...expenses
      .slice(4, 14)
      .map((cat, i) => ({ cat, budgeted: 40_000 + i * 10_000, actual: i * 9_000 })),
  ];

  return {
    userName: 'Aleksandra Wiśniewska-Kowalczyk de Albuquerque e Vasconcelos Pereira',
    accounts,
    categories,
    transactions,
    transactionTotal: 1_284,
    summary: (month) => ({
      month,
      income: BILLION,
      expense: expenseTotal,
      balance: -ALMOST_BILLION,
      savingsRate: ((BILLION - expenseTotal) / BILLION) * 100,
      previous: { month: previousMonth(month), income: 1, expense: BILLION, balance: BILLION },
      delta: {
        income: { absolute: BILLION - 1, percent: 9_999_999_999_900 },
        expense: { absolute: expenseTotal - BILLION, percent: 99.99 },
        balance: { absolute: -ALMOST_BILLION - BILLION, percent: -199.99 },
      },
    }),
    spending: (month) => ({ month, total: expenseTotal, items: spendingItems }),
    history: (from, to) => ({
      points: monthsBetween(from, to).map((month, i) => {
        const income = i % 2 === 0 ? BILLION : 1;
        const expense = i % 3 === 0 ? expenseTotal : ALMOST_BILLION;
        return { month, income, expense, net: income - expense };
      }),
    }),
    balance: {
      granularity: 'day',
      points: Array.from({ length: 35 }, (_, i) => {
        const date = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
        return { date, balance: i < 17 ? BILLION - i * 1_000_000_000 : -ALMOST_BILLION + i };
      }),
    },
    budgetVsActual: (month) => {
      const items = budgetRows.map(({ cat, budgeted, actual }) => ({
        categoryId: cat.id,
        name: cat.name,
        color: cat.color,
        budgeted,
        actual,
        remaining: budgeted - actual,
        percentUsed: (actual / budgeted) * 100,
      }));
      const budgeted = items.reduce((s, i) => s + i.budgeted, 0);
      const actual = items.reduce((s, i) => s + i.actual, 0);
      return { month, items, totals: { budgeted, actual, remaining: budgeted - actual } };
    },
    budgets: (month) =>
      budgetRows.map(({ cat, budgeted, actual }, i) => ({
        id: uuid(4, i + 1),
        categoryId: cat.id,
        month,
        amount: budgeted,
        spent: actual,
        remaining: budgeted - actual,
      })),
    imports: [
      {
        id: uuid(5, 1),
        accountId: a1.id,
        fileName: `extrato_${LONG_WORD.slice(0, 90)}_2026-10_conta_corrente_versao_final_corrigida_(2).csv`,
        rowCount: 5_000,
        importedCount: 4_998,
        skippedCount: 2,
        createdAt: NOW,
      },
      {
        id: uuid(5, 2),
        accountId: uuid(1, 99), // an account that no longer exists
        fileName: null,
        rowCount: 1,
        importedCount: 1,
        skippedCount: 0,
        createdAt: '2026-10-01T09:30:00.000Z',
      },
    ],
  };
}

/** The preview the worst case answers for any uploaded CSV: long rows, errors, duplicates. */
function worstPreview(accountId: string, categoryId: string) {
  const row = (rowNumber: number, description: string, amount: number, extra = {}) => ({
    rowNumber,
    raw: { date: '2026-11-04', description, amount: String(amount / 100) },
    mapped: { date: '2026-11-04', description, type: 'expense', amount },
    error: null,
    suggestedCategoryId: categoryId,
    duplicate: false,
    ...extra,
  });
  const rows = [
    row(1, LONG_DESCRIPTION, BILLION),
    row(2, LONG_WORD, ALMOST_BILLION, { duplicate: true }),
    row(3, 'Café ☕ — padaria 東京', 1, { suggestedCategoryId: null }),
    {
      rowNumber: 4,
      raw: { date: '31/02/2026', description: LONG_URL, amount: 'R$ mil e duzentos' },
      mapped: null,
      error: `Data inválida "31/02/2026" e valor "R$ mil e duzentos" não é um número — ${LONG_WORD}`,
      suggestedCategoryId: null,
      duplicate: false,
    },
  ];
  return { accountId, rows, validCount: 3, invalidCount: 1, duplicateCount: 1 };
}

/* ------------------------------------------------------------------------------------------ */
/* Usuário novo / Uma transação                                                               */
/* ------------------------------------------------------------------------------------------ */

function newUserDataset(): Dataset {
  return {
    userName: 'Jo',
    accounts: [],
    categories: [],
    transactions: [],
    transactionTotal: 0,
    summary: (month) => emptySummary(month),
    spending: (month) => ({ month, total: 0, items: [] }),
    history: (from, to) => ({
      points: monthsBetween(from, to).map((month) => ({ month, income: 0, expense: 0, net: 0 })),
    }),
    balance: { granularity: 'day', points: [] },
    budgetVsActual: (month) => ({
      month,
      items: [],
      totals: { budgeted: 0, actual: 0, remaining: 0 },
    }),
    budgets: () => [],
    imports: [],
  };
}

function oneDataset(): Dataset {
  const carteira = account(1, 'Carteira', -4_590, 'cash', { icon: 'wallet', color: '#1F7A80' });
  const mercado = category(1, 'Mercado', 'expense', '#D06A1F', 'cart');
  const only = transaction(1, 'expense', 'Feira', 4_590, '2026-11-04', carteira, mercado);
  return {
    userName: 'Jo',
    accounts: [carteira],
    categories: [mercado],
    transactions: [only],
    transactionTotal: 1,
    summary: (month) =>
      month === '2026-11'
        ? {
            ...emptySummary(month),
            expense: 4_590,
            balance: -4_590,
            delta: {
              income: zeroDelta,
              expense: { absolute: 4_590, percent: null },
              balance: { absolute: -4_590, percent: null },
            },
          }
        : emptySummary(month),
    spending: (month) =>
      month === '2026-11'
        ? {
            month,
            total: 4_590,
            items: [
              {
                categoryId: mercado.id,
                name: 'Mercado',
                color: mercado.color,
                icon: 'cart',
                amount: 4_590,
                percent: 100,
              },
            ],
          }
        : { month, total: 0, items: [] },
    history: (from, to) => ({
      points: monthsBetween(from, to).map((month) =>
        month === '2026-11'
          ? { month, income: 0, expense: 4_590, net: -4_590 }
          : { month, income: 0, expense: 0, net: 0 },
      ),
    }),
    balance: { granularity: 'day', points: [{ date: '2026-11-04', balance: -4_590 }] },
    budgetVsActual: (month) => ({
      month,
      items: [
        {
          categoryId: mercado.id,
          name: 'Mercado',
          color: mercado.color,
          budgeted: 1,
          actual: 4_590,
          remaining: -4_589,
          percentUsed: 459_000,
        },
      ],
      totals: { budgeted: 1, actual: 4_590, remaining: -4_589 },
    }),
    budgets: (month) => [
      { id: uuid(4, 1), categoryId: mercado.id, month, amount: 1, spent: 4_590, remaining: -4_589 },
    ],
    imports: [],
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Router                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const ok = (body: unknown): FakeReply => ({ status: 200, body });
const noContent: FakeReply = { status: 204 };
const apiError = (status: number, code: string, message: string): FakeReply => ({
  status,
  body: { error: { code, message } },
});

function datasetHandler(data: Dataset): ScenarioHandler {
  let transactions = [...data.transactions];
  return ({ method, path, query, body }) => {
    const route = `${method} ${path.replace(/\/[0-9a-f-]{36}$/, '/:id')}`;
    switch (route) {
      case 'POST /auth/refresh':
        return ok(tokens);
      case 'POST /auth/logout':
        return noContent;
      case 'GET /me':
        return ok(user(data.userName));
      case 'GET /accounts':
        return ok(
          query.get('includeArchived') === 'true'
            ? data.accounts
            : data.accounts.filter((a) => !a.archived),
        );
      case 'GET /categories':
        return ok(
          query.get('kind')
            ? data.categories.filter((c) => c.kind === query.get('kind'))
            : data.categories,
        );
      case 'GET /transactions': {
        const page = Number(query.get('page') ?? 1);
        const pageSize = Number(query.get('pageSize') ?? 20);
        const search = (query.get('search') ?? '').toLowerCase();
        const pool = search
          ? transactions.filter((t) => t.description.toLowerCase().includes(search))
          : transactions;
        const total = search
          ? pool.length
          : Math.max(
              pool.length,
              data.transactionTotal - (data.transactions.length - transactions.length),
            );
        const start = (page - 1) * pageSize;
        const items = pool.length
          ? Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, i) => {
              const base = pool[(start + i) % pool.length]!;
              return start + i < pool.length ? base : { ...base, id: uuid(9, start + i) };
            })
          : [];
        return ok({
          items,
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        });
      }
      case 'PATCH /transactions/:id': {
        const id = path.split('/').pop();
        const found = transactions.find((t) => t.id === id);
        if (!found) return apiError(404, 'NOT_FOUND', 'Lançamento não encontrado');
        const next = { ...found, ...(body as object), updatedAt: NOW } as Transaction;
        transactions = transactions.map((t) => (t.id === id ? next : t));
        return ok(next);
      }
      case 'DELETE /transactions/:id':
        transactions = transactions.filter((t) => t.id !== path.split('/').pop());
        return noContent;
      case 'GET /summary/month':
        return ok(data.summary(query.get('month') ?? ''));
      case 'GET /summary/spending-by-category':
        return ok(data.spending(query.get('month') ?? ''));
      case 'GET /summary/income-vs-expense':
        return ok(data.history(query.get('from') ?? '', query.get('to') ?? ''));
      case 'GET /summary/balance-history':
        return ok(data.balance);
      case 'GET /summary/budget-vs-actual':
        return ok(data.budgetVsActual(query.get('month') ?? ''));
      case 'GET /budgets':
        return ok(data.budgets(query.get('month') ?? ''));
      case 'GET /imports':
        return ok(data.imports);
      case 'POST /imports/csv/preview': {
        const { accountId } = body as { accountId: string };
        return ok(worstPreview(accountId, data.categories[0]?.id ?? uuid(2, 1)));
      }
      default:
        return apiError(501, 'NOT_IMPLEMENTED', `Cenário de desenvolvimento sem a rota ${route}`);
    }
  };
}

/** Signed in, but every data request fails: the network dropped after the session started. */
function failingHandler(fail: () => FakeReply): ScenarioHandler {
  const session = datasetHandler(newUserDataset());
  return (request) => {
    if (request.path === '/auth/refresh' || request.path === '/me') return session(request);
    return fail();
  };
}

export function scenarioHandler(scenario: Scenario): ScenarioHandler {
  switch (scenario) {
    case 'pior':
      return datasetHandler(worstDataset());
    case 'novo':
      return datasetHandler(newUserDataset());
    case 'uma':
      return datasetHandler(oneDataset());
    case 'sem-rede':
      return failingHandler(() => {
        throw new TypeError('Failed to fetch');
      });
    case 'erro-500':
      return failingHandler(() => apiError(500, 'INTERNAL', 'Erro interno do servidor'));
  }
}
