import { DESCRIPTION_MAX, previousMonth, toMonthKey, type MonthKey } from '@sobra/shared';
import type {
  AccountInput,
  BudgetVsActual,
  CategoryInput,
  MonthSummaryInput,
  SpendingByCategory,
  TransactionInput,
  UserInput,
} from '../test/types';

/*
 * Data for the dev-only scenarios (break-ui) and the regression tests. Every value is either
 * realistic or the limit the API accepts: names at their schema maximum (category 40, account
 * 60, user 80, description 120), amounts past what the keypad types (imports and the web have no
 * cap below Number.MAX_SAFE_INTEGER), non-Latin scripts and emoji. Shaped like the API's JSON.
 */

const ts = '2026-10-01T12:00:00.000Z';
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

export type ScenarioData = {
  user: UserInput;
  accounts: AccountInput[];
  categories: CategoryInput[];
  transactions: TransactionInput[];
  summary: (month: MonthKey) => MonthSummaryInput;
  spending: (month: MonthKey) => SpendingByCategory;
  budgets: (month: MonthKey) => BudgetVsActual;
};

/** R$ 1.000.000.000,00 and −R$ 999.999.999,99, the extremes the brief asks for. */
export const BILLION = 100_000_000_000;
export const ALMOST_BILLION = 99_999_999_999;

export const LONG_DESCRIPTION =
  'Reforma completa do banheiro social com troca de piso, revestimento, louças, metais, box de vidro e mão de obra — parcela 3 de 10 (entrada paga)'.slice(
    0,
    DESCRIPTION_MAX,
  );
export const UNBROKEN_DESCRIPTION =
  'PAGAMENTOBOLETOCONDOMINIORESIDENCIALJARDIMDASPALMEIRASBLOCOBAPTO1204REFERENTEOUTUBRO2026TAXAEXTRAORDINARIAFUNDODERESERVAOBRAS'.slice(
    0,
    DESCRIPTION_MAX,
  );

function account(n: number, name: string, balance: number): AccountInput {
  return {
    id: id(0xa00 + n),
    name,
    type: 'checking',
    initialBalance: 0,
    balance,
    color: '#1F7A80',
    icon: 'wallet',
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

function category(
  n: number,
  name: string,
  kind: CategoryInput['kind'],
  icon: CategoryInput['icon'],
  color: string,
): CategoryInput {
  return { id: id(0xc00 + n), name, kind, color, icon, createdAt: ts, updatedAt: ts };
}

type TxSeed = {
  n: number;
  type: 'income' | 'expense';
  category: CategoryInput;
  account: AccountInput;
  amount: number;
  description: string;
  date: string;
};

function tx({ n, type, category: cat, account: acc, amount, description, date }: TxSeed) {
  return {
    id: id(0xf00 + n),
    type,
    accountId: acc.id,
    categoryId: cat.id,
    amount,
    description,
    date,
    notes: null,
    createdAt: ts,
    updatedAt: ts,
    account: { id: acc.id, name: acc.name },
    category: { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon },
    toAccount: null,
  } satisfies TransactionInput;
}

function summaryOf(month: MonthKey, income: number, expense: number, balance: number) {
  return {
    month,
    income,
    expense,
    balance,
    savingsRate: income === 0 ? null : ((income - expense) / income) * 100,
    previous: { month: previousMonth(month), income: 0, expense: 0, balance: 0 },
    delta: {
      income: { absolute: income, percent: null },
      expense: { absolute: expense, percent: null },
      balance: { absolute: balance, percent: null },
    },
  } satisfies MonthSummaryInput;
}

function spendingOf(month: MonthKey, items: [CategoryInput, number][]): SpendingByCategory {
  const total = items.reduce((sum, [, amount]) => sum + amount, 0);
  return {
    month,
    total,
    items: items.map(([cat, amount]) => ({
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      amount,
      percent: total === 0 ? 0 : (amount / total) * 100,
    })),
  } as unknown as SpendingByCategory;
}

function budgetsOf(month: MonthKey, items: [CategoryInput, number, number][]): BudgetVsActual {
  return {
    month,
    items: items.map(([cat, budgeted, actual]) => ({
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      budgeted,
      actual,
      remaining: budgeted - actual,
      percentUsed: (actual / budgeted) * 100,
    })),
    totals: { budgeted: 0, actual: 0, remaining: 0 },
  } as unknown as BudgetVsActual;
}

/** "YYYY-MM-DD" in the current month, so the list shows today's rows. */
function day(n: number): string {
  return `${toMonthKey(new Date())}-${String(n).padStart(2, '0')}`;
}

const todayDay = () => Math.max(1, Math.min(new Date().getDate(), 28));

// ——— Worst case ———————————————————————————————————————————————————————————————————————————

const worstAccounts = [
  account(1, 'Conta Corrente Conjunta Banco do Brasil Ag. 1234-5 Família', ALMOST_BILLION * -1),
  account(2, '日本円の口座 💴', BILLION),
];

/** 16 expense categories (13+ in the grid) and 2 income ones; names up to the 40-char limit. */
const worstCategories = [
  category(1, 'Supermercado, hortifrúti e padaria do 🏘', 'expense', 'cart', '#3A64C8'),
  category(2, 'Manutençãoautomotivapreventivaecorretiva', 'expense', 'car', '#D06A1F'),
  category(3, 'Educação 🎓', 'expense', 'graduation-cap', '#2E8B57'),
  category(4, 'Jo', 'expense', 'gift', '#B54076'),
  category(5, '教育費・塾', 'expense', 'graduation-cap', '#9B6FD0'),
  category(6, 'مطاعم', 'expense', 'utensils', '#2E8FBF'),
  category(7, 'Ônibus, metrô e trem', 'expense', 'bus', '#6B6B66'),
  category(8, 'Pets 🐶🐱', 'expense', 'paw', '#A0785A'),
  category(9, 'Saúde e farmácia', 'expense', 'heart-pulse', '#B4532A'),
  category(10, 'Assinaturas de streaming e softwares', 'expense', 'music', '#8A4FA8'),
  category(11, 'Água, luz e gás', 'expense', 'zap', '#B28A00'),
  category(12, 'Vestuário', 'expense', 'shirt', '#79821D'),
  category(13, 'Presentes de aniversário e casamento', 'expense', 'gift', '#1F7A80'),
  category(14, 'Viagens ✈️', 'expense', 'plane', '#3A64C8'),
  category(15, 'Impostos (IPTU, IPVA, IRPF)', 'expense', 'landmark', '#D06A1F'),
  category(16, 'Lazer', 'expense', 'film', '#2E8B57'),
  category(17, 'Pró-labore e distribuição de lucros MEI', 'income', 'briefcase', '#2E8B57'),
  category(18, 'Freelas', 'income', 'trending-up', '#3A64C8'),
];
const cat = (n: number) => worstCategories[n - 1] as CategoryInput;
const salary = cat(17);
const [a1, a2] = worstAccounts as [AccountInput, AccountInput];

function worstTransactions(): TransactionInput[] {
  const today = todayDay();
  const rows: Omit<TxSeed, 'n'>[] = [
    {
      type: 'income',
      category: salary,
      account: a2,
      amount: BILLION,
      description: 'Venda da empresa 🎉',
      date: day(today),
    },
    {
      type: 'expense',
      category: cat(1),
      account: a1,
      amount: ALMOST_BILLION,
      description: LONG_DESCRIPTION,
      date: day(today),
    },
    {
      type: 'expense',
      category: cat(2),
      account: a1,
      amount: 1,
      description: UNBROKEN_DESCRIPTION,
      date: day(today),
    },
    {
      type: 'expense',
      category: cat(6),
      account: a2,
      amount: 4_590,
      description: 'مطعم الشام — جانتار',
      date: day(Math.max(today - 1, 1)),
    },
    {
      type: 'expense',
      category: cat(5),
      account: a2,
      amount: 12_000,
      description: 'ラーメン屋さん 🍜',
      date: day(Math.max(today - 1, 1)),
    },
    {
      type: 'expense',
      category: cat(4),
      account: a1,
      amount: 100,
      description: 'Jo',
      date: day(Math.max(today - 2, 1)),
    },
    {
      type: 'expense',
      category: cat(3),
      account: a1,
      amount: 89_990,
      description: '<b>Mensalidade</b> &amp; material',
      date: day(Math.max(today - 3, 1)),
    },
  ];
  return rows.map((row, index) => tx({ ...row, n: index + 1 }));
}

export const worstCase: ScenarioData = {
  user: {
    id: id(1),
    name: 'Maria Aparecida dos Santos Albuquerque de Vasconcellos Cavalcanti Wiśniewska',
    email:
      'maria.aparecida.albuquerque.vasconcellos+sobra-pessoais@correio-eletronico-corporativo.example.com.br',
    createdAt: ts,
  },
  accounts: worstAccounts,
  categories: worstCategories,
  get transactions() {
    return worstTransactions();
  },
  summary: (month) =>
    summaryOf(month, BILLION, ALMOST_BILLION + 1 + 4_590 + 12_000, -ALMOST_BILLION),
  spending: (month) =>
    spendingOf(month, [
      [cat(1), ALMOST_BILLION],
      [cat(3), 89_990],
      [cat(5), 12_000],
      [cat(6), 4_590],
      [cat(4), 100],
      [cat(2), 1],
      [cat(7), 50],
      [cat(8), 40],
    ]),
  budgets: (month) =>
    budgetsOf(month, [
      // 1000% over: R$ 100 budget, R$ 1.000 spent.
      [cat(2), 10_000, 100_000],
      [cat(1), BILLION, ALMOST_BILLION],
      [cat(9), 50_000, 43_000],
      [cat(10), 1, 0],
    ]),
};

// ——— New user: default account and categories, nothing else ———————————————————————————————

const newUserCategories = [
  category(101, 'Mercado', 'expense', 'cart', '#3A64C8'),
  category(102, 'Transporte', 'expense', 'bus', '#D06A1F'),
  category(103, 'Moradia', 'expense', 'home', '#2E8B57'),
  category(104, 'Salário', 'income', 'briefcase', '#2E8B57'),
];

export const newUser: ScenarioData = {
  user: { id: id(2), name: 'Jo', email: 'jo@a.co', createdAt: ts },
  accounts: [account(101, 'Conta principal', 0)],
  categories: newUserCategories,
  transactions: [],
  summary: (month) => summaryOf(month, 0, 0, 0),
  spending: (month) => spendingOf(month, []),
  budgets: (month) => budgetsOf(month, []),
};

// ——— One transaction ——————————————————————————————————————————————————————————————————————

const oneAccount = account(201, 'Nubank', -1_250);
const oneCategory = newUserCategories[0] as CategoryInput;

export const oneTransaction: ScenarioData = {
  ...newUser,
  accounts: [oneAccount],
  get transactions() {
    return [
      tx({
        n: 201,
        type: 'expense',
        category: oneCategory,
        account: oneAccount,
        amount: 1_250,
        description: 'Pão de queijo',
        date: day(todayDay()),
      }),
    ];
  },
  summary: (month) =>
    month === toMonthKey(new Date())
      ? summaryOf(month, 0, 1_250, -1_250)
      : summaryOf(month, 0, 0, 0),
  spending: (month) =>
    spendingOf(month, month === toMonthKey(new Date()) ? [[oneCategory, 1_250]] : []),
  budgets: (month) =>
    budgetsOf(month, month === toMonthKey(new Date()) ? [[oneCategory, 1_000, 1_250]] : []),
};
