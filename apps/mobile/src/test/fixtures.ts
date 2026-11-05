import type {
  AccountInput,
  BudgetVsActual,
  CategoryInput,
  MonthSummaryInput,
  SpendingByCategory,
  TransactionInput,
  UserInput,
} from './types';

const ts = '2026-10-01T12:00:00.000Z';

export const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  checking: '00000000-0000-4000-8000-0000000000a1',
  wallet: '00000000-0000-4000-8000-0000000000a2',
  mercado: '00000000-0000-4000-8000-0000000000c1',
  transporte: '00000000-0000-4000-8000-0000000000c2',
  lazer: '00000000-0000-4000-8000-0000000000c3',
  salario: '00000000-0000-4000-8000-0000000000c4',
  tx1: '00000000-0000-4000-8000-0000000000f1',
  tx2: '00000000-0000-4000-8000-0000000000f2',
  tx3: '00000000-0000-4000-8000-0000000000f3',
  created: '00000000-0000-4000-8000-0000000000f9',
} as const;

export const user: UserInput = {
  id: ids.user,
  name: 'Ana Demo',
  email: 'demo@sobra.dev',
  createdAt: ts,
};

export const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

export const accounts: AccountInput[] = [
  account(ids.checking, 'Nubank', 'checking', 512_300),
  account(ids.wallet, 'Carteira', 'cash', 8_000),
];

function account(
  id: string,
  name: string,
  type: AccountInput['type'],
  balance: number,
): AccountInput {
  return {
    id,
    name,
    type,
    initialBalance: 0,
    balance,
    color: '#1C50B5',
    icon: 'wallet',
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

export const categories: CategoryInput[] = [
  category(ids.mercado, 'Mercado', 'expense', 'cart'),
  category(ids.transporte, 'Transporte', 'expense', 'bus'),
  category(ids.lazer, 'Lazer', 'expense', 'film'),
  category(ids.salario, 'Salário', 'income', 'briefcase'),
];

function category(
  id: string,
  name: string,
  kind: CategoryInput['kind'],
  icon: CategoryInput['icon'],
): CategoryInput {
  return { id, name, kind, color: '#B17000', icon, createdAt: ts, updatedAt: ts };
}

export function expense(
  id: string,
  categoryId: string,
  accountId: string,
  amount: number,
  date: string,
): TransactionInput {
  const cat = categories.find((item) => item.id === categoryId);
  const acc = accounts.find((item) => item.id === accountId);
  return {
    id,
    type: 'expense',
    accountId,
    categoryId,
    amount,
    description: cat?.name ?? 'Gasto',
    date,
    notes: null,
    createdAt: ts,
    updatedAt: ts,
    account: { id: accountId, name: acc?.name ?? 'Conta' },
    category: cat ? { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } : null,
    toAccount: null,
  };
}

export function income(
  id: string,
  categoryId: string,
  accountId: string,
  amount: number,
  date: string,
): TransactionInput {
  return {
    ...expense(id, categoryId, accountId, amount, date),
    type: 'income',
  } as TransactionInput;
}

export function transfer(
  id: string,
  accountId: string,
  toAccountId: string,
  amount: number,
  date: string,
): TransactionInput {
  const name = (accountIdOf: string) =>
    accounts.find((item) => item.id === accountIdOf)?.name ?? 'Conta';
  return {
    id,
    type: 'transfer',
    accountId,
    toAccountId,
    amount,
    description: 'Transferência',
    date,
    notes: null,
    createdAt: ts,
    updatedAt: ts,
    account: { id: accountId, name: name(accountId) },
    category: null,
    toAccount: { id: toAccountId, name: name(toAccountId) },
  };
}

/** Transporte used twice, Mercado once, all on the checking account. */
export const recent: TransactionInput[] = [
  expense(ids.tx1, ids.transporte, ids.checking, 1_000, '2026-11-03'),
  expense(ids.tx2, ids.transporte, ids.checking, 1_200, '2026-11-02'),
  expense(ids.tx3, ids.mercado, ids.checking, 8_000, '2026-11-01'),
];

export function page<T>(items: T[]) {
  return { items, page: 1, pageSize: 100, total: items.length, totalPages: 1 };
}

export function monthSummary(
  month: string,
  previousMonth: string,
  values: {
    income: number;
    expense: number;
    previousIncome?: number;
    previousExpense?: number;
  },
): MonthSummaryInput {
  const previousIncome = values.previousIncome ?? values.income;
  const previousExpense = values.previousExpense ?? values.expense;
  const savingsRate =
    values.income === 0 ? null : ((values.income - values.expense) / values.income) * 100;
  return {
    month,
    income: values.income,
    expense: values.expense,
    balance: 1_604_043,
    savingsRate,
    previous: {
      month: previousMonth,
      income: previousIncome,
      expense: previousExpense,
      balance: 1_500_000,
    },
    delta: {
      income: { absolute: values.income - previousIncome, percent: null },
      expense: { absolute: values.expense - previousExpense, percent: null },
      balance: { absolute: 104_043, percent: null },
    },
  };
}

export function spending(month: string, items: [string, number][]): SpendingByCategory {
  const total = items.reduce((sum, [, amount]) => sum + amount, 0);
  return {
    month,
    total,
    items: items.map(([categoryId, amount]) => {
      const cat = categories.find((item) => item.id === categoryId);
      return {
        categoryId,
        name: cat?.name ?? '?',
        color: cat?.color ?? '#000000',
        icon: cat?.icon ?? 'cart',
        amount,
        percent: (amount / total) * 100,
      };
    }),
  } as SpendingByCategory;
}

export function budgets(month: string, items: [string, number, number][]): BudgetVsActual {
  return {
    month,
    items: items.map(([categoryId, budgeted, actual]) => {
      const cat = categories.find((item) => item.id === categoryId);
      return {
        categoryId,
        name: cat?.name ?? '?',
        color: cat?.color ?? '#000000',
        budgeted,
        actual,
        remaining: budgeted - actual,
        percentUsed: (actual / budgeted) * 100,
      };
    }),
    totals: { budgeted: 0, actual: 0, remaining: 0 },
  } as BudgetVsActual;
}
