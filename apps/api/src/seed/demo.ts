import {
  accountCreateSchema,
  type AccountCreateInput,
  type Cents,
  cents,
  lastNMonths,
  type MonthKey,
  monthKey,
  percentOf,
  recurringCreateSchema,
  type RecurringCreateInput,
  type TransactionCreate,
} from '@sobra/shared';
import type { Db, PrismaClient } from '../lib/db';
import { fromDbCents, sumOrZero, toDbCents } from '../lib/money';
import { daysOfMonth, monthDateRange } from '../lib/period';
import { createAccount, listAccounts } from '../modules/accounts/service';
import type { PasswordHasher } from '../modules/auth/password';
import { createUserWithDefaults } from '../modules/auth/service';
import { createRecurring, syncDueRecurring } from '../modules/recurring/service';
import { incomeVsExpense, monthSummary } from '../modules/summary/service';
import { transactionData } from '../modules/transactions/service';
import { createRandom, type Random } from './random';

export const DEMO_USER = {
  name: 'Ana Demo',
  email: 'demo@sobra.dev',
  password: 'demo1234',
} as const;

export const DEMO_MONTHS = 6;
const DEMO_SEED = 0x20261104;

const SALARY = 680_000;
const RENT = 185_000;
const SAVINGS_YIELD_RATE = 0.0055;

/** Fixed national holidays (MM-DD), enough to place the 5th business day realistically. */
const HOLIDAYS = new Set([
  '01-01',
  '04-21',
  '05-01',
  '09-07',
  '10-12',
  '11-02',
  '11-15',
  '11-20',
  '12-25',
]);

const ACCOUNTS = {
  nubank: {
    name: 'Nubank',
    type: 'checking',
    initialBalance: 250_000,
    color: '#820AD1',
    icon: 'landmark',
  },
  savings: {
    name: 'Poupança Caixa',
    type: 'savings',
    initialBalance: 800_000,
    color: '#005CA9',
    icon: 'piggy-bank',
  },
  card: {
    name: 'Cartão Inter',
    type: 'credit_card',
    initialBalance: 0,
    color: '#FF7A00',
    icon: 'credit-card',
  },
} satisfies Record<string, AccountCreateInput>;

const SUBSCRIPTIONS = [
  { description: 'Netflix', amount: 5_590, day: 12, account: 'card' },
  { description: 'Spotify', amount: 2_190, day: 20, account: 'card' },
  { description: 'iCloud+ 200 GB', amount: 1_690, day: 8, account: 'card' },
  { description: 'Smart Fit — mensalidade', amount: 10_990, day: 5, account: 'nubank' },
] as const;

/** Monthly budget per expense category, in cents. Mercado is raised halfway through. */
const BUDGETS: Record<string, (index: number) => number> = {
  Moradia: () => 270_000,
  Mercado: (index) => (index < 3 ? 100_000 : 120_000),
  Transporte: () => 55_000,
  Restaurantes: () => 50_000,
  Lazer: () => 30_000,
  Saúde: () => 15_000,
  Assinaturas: () => 27_000,
};

type AccountKey = keyof typeof ACCOUNTS | 'wallet';
type Refs = { accounts: Record<AccountKey, string>; categories: Map<string, string> };

export type DemoMonth = {
  month: MonthKey;
  transactions: number;
  income: Cents;
  expense: Cents;
  savingsRate: number | null;
};

export type DemoSummary = {
  userId: string;
  today: string;
  months: DemoMonth[];
  totalBalance: Cents;
  balances: { name: string; balance: Cents }[];
  current: { month: MonthKey; income: Cents; expense: Cents };
};

function categoryOf(refs: Refs, name: string): string {
  const id = refs.categories.get(name);
  if (!id) throw new Error(`Categoria padrão ausente: ${name}`);
  return id;
}

const pad = (value: number) => String(value).padStart(2, '0');
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const isWeekend = (date: string) => weekday(date) === 0 || weekday(date) === 6;
const isBusinessDay = (date: string) => !isWeekend(date) && !HOLIDAYS.has(date.slice(5));

function dayOf(month: MonthKey, day: number): string {
  return `${month}-${pad(Math.min(day, daysOfMonth(month).length))}`;
}

function nthBusinessDay(month: MonthKey, n: number): string {
  const days = daysOfMonth(month).filter(isBusinessDay);
  return days[n - 1] ?? days.at(-1) ?? `${month}-01`;
}

function businessDayAfter(month: MonthKey, date: string, offset: number): string {
  const days = daysOfMonth(month).filter((day) => day > date && isBusinessDay(day));
  return days[offset - 1] ?? days.at(-1) ?? date;
}

const between = (random: Random, min: number, max: number) => cents(random.int(min, max));

/**
 * Builds the transactions of every demo month, drawing from the PRNG in a fixed order. Dates
 * after `today` are drawn too (and dropped), so the sequence only depends on the months.
 */
function generateMonths(random: Random, refs: Refs, months: MonthKey[], today: string) {
  const rows: TransactionCreate[] = [];
  const category = (name: string) => categoryOf(refs, name);
  const expense = (
    date: string,
    account: AccountKey,
    name: string,
    amount: number,
    description: string,
  ) =>
    rows.push({
      type: 'expense',
      date,
      accountId: refs.accounts[account],
      categoryId: category(name),
      amount: cents(amount),
      description,
    });
  const income = (
    date: string,
    account: AccountKey,
    name: string,
    amount: number,
    description: string,
  ) =>
    rows.push({
      type: 'income',
      date,
      accountId: refs.accounts[account],
      categoryId: category(name),
      amount: cents(amount),
      description,
    });
  const transfer = (
    date: string,
    from: AccountKey,
    to: AccountKey,
    amount: number,
    description: string,
  ) =>
    rows.push({
      type: 'transfer',
      date,
      accountId: refs.accounts[from],
      toAccountId: refs.accounts[to],
      amount: cents(amount),
      description,
    });

  const complete = months.slice(0, -1);
  const freelanceMonths = new Set(random.sample(2, 0, complete.length - 1));
  const [giftMonth, tripMonth] = random.sample(2, 0, complete.length - 1);
  const spread = complete.map(
    (_, i) => 6 + Math.round((18 * i) / Math.max(complete.length - 1, 1)),
  );
  const targetRates = random.shuffle(spread).map((rate) => rate + random.int(-1, 1));
  let savingsBalance = ACCOUNTS.savings.initialBalance;

  months.forEach((month, index) => {
    const dim = daysOfMonth(month).length;
    const weekends = daysOfMonth(month).filter(isWeekend);

    const yieldAmount = Math.round(savingsBalance * SAVINGS_YIELD_RATE);
    income(`${month}-01`, 'savings', 'Rendimentos', yieldAmount, 'Rendimento da poupança');
    savingsBalance += yieldAmount;

    const payday = nthBusinessDay(month, 5);
    income(payday, 'nubank', 'Salário', SALARY, 'Salário — Acme Tecnologia');
    const saved = random.pick([40_000, 50_000, 60_000, 80_000]);
    transfer(businessDayAfter(month, payday, 1), 'nubank', 'savings', saved, 'Guardar na poupança');
    savingsBalance += saved;
    transfer(businessDayAfter(month, payday, 2), 'nubank', 'wallet', 20_000, 'Saque 24 Horas');

    expense(
      dayOf(month, 5),
      'nubank',
      'Moradia',
      between(random, 43_000, 47_000),
      'Condomínio Ed. Primavera',
    );
    expense(
      dayOf(month, 15),
      'nubank',
      'Moradia',
      between(random, 14_000, 26_000),
      'Enel — conta de luz',
    );
    expense(
      dayOf(month, 18),
      'nubank',
      'Moradia',
      random.pick([9_990, 9_990, 10_490]),
      'Vivo Fibra',
    );
    expense(
      dayOf(month, 22),
      'nubank',
      'Assinaturas',
      random.pick([5_990, 5_990, 6_490]),
      'Claro — plano celular',
    );

    for (const day of random.sample(random.int(3, 5), 1, dim)) {
      const store = random.pick([
        'Pão de Açúcar',
        'Carrefour',
        'Assaí Atacadista',
        'Dia Supermercado',
        'Hortifruti',
      ]);
      expense(
        dayOf(month, day),
        random.chance(0.25) ? 'card' : 'nubank',
        'Mercado',
        between(random, 8_000, 45_000),
        store,
      );
    }
    for (const day of random.sample(random.int(2, 4), 1, dim)) {
      expense(dayOf(month, day), 'wallet', 'Mercado', between(random, 1_500, 4_500), 'Feira livre');
    }

    for (const day of random.sample(random.int(3, 7), 1, dim)) {
      const ride = random.pick(['Uber *Trip', 'Uber *Trip', '99 *Corrida']);
      expense(dayOf(month, day), 'card', 'Transporte', between(random, 1_400, 4_800), ride);
    }
    for (const day of random.sample(random.int(1, 2), 1, dim)) {
      const station = random.pick(['Posto Shell', 'Posto Ipiranga']);
      expense(dayOf(month, day), 'nubank', 'Transporte', between(random, 15_000, 25_000), station);
    }

    for (const day of random.sample(random.int(3, 6), 1, dim)) {
      const place = random.pick([
        'iFood *Restaurante',
        'iFood *Burger King',
        'iFood *Sushi',
        'Madero',
        'Spoleto',
        'Padaria Real',
      ]);
      expense(dayOf(month, day), 'card', 'Restaurantes', between(random, 3_500, 12_000), place);
    }

    for (const position of random.sample(random.int(2, 4), 0, weekends.length - 1)) {
      const outing = random.pick([
        'Cinemark',
        'Ingresso.com',
        'Bar do Alemão',
        'Sympla *Show',
        'Parque Villa-Lobos — food truck',
      ]);
      expense(
        weekends[position] ?? `${month}-01`,
        'card',
        'Lazer',
        between(random, 4_000, 15_000),
        outing,
      );
    }

    if (random.chance(0.5)) {
      const pharmacy = random.pick(['Drogasil', 'Droga Raia']);
      expense(
        dayOf(month, random.int(1, dim)),
        'nubank',
        'Saúde',
        between(random, 3_000, 18_000),
        pharmacy,
      );
    }
    if (random.chance(0.2)) {
      expense(
        dayOf(month, random.int(1, dim)),
        'nubank',
        'Saúde',
        25_000,
        'Consulta — Dra. Helena',
      );
    }

    if (freelanceMonths.has(index)) {
      income(
        dayOf(month, random.int(10, 25)),
        'nubank',
        'Freelance',
        between(random, 80_000, 250_000),
        'Freelance — site para cliente',
      );
    }
    if (index === giftMonth) {
      expense(
        dayOf(month, random.int(1, dim)),
        'card',
        'Compras',
        between(random, 18_000, 35_000),
        'Presente de aniversário — Renner',
      );
      expense(
        dayOf(month, random.int(1, dim)),
        'nubank',
        'Outros',
        between(random, 35_000, 65_000),
        'Conserto da máquina de lavar',
      );
    }
    if (index === tripMonth) {
      const saturday =
        weekends.find((day) => weekday(day) === 6 && day >= `${month}-08`) ??
        weekends[0] ??
        `${month}-01`;
      expense(saturday, 'card', 'Lazer', between(random, 90_000, 140_000), 'Pousada em Paraty');
      expense(
        saturday,
        'card',
        'Transporte',
        between(random, 18_000, 26_000),
        'Passagem rodoviária — Paraty',
      );
      expense(
        saturday,
        'card',
        'Restaurantes',
        between(random, 15_000, 25_000),
        'Restaurante Banana da Terra',
      );
    }
  });

  return { rows: rows.filter((row) => row.date <= today), targetRates };
}

async function deleteDemoUser(db: Db, email: string): Promise<void> {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!existing) return;
  const where = { userId: existing.id };
  await db.transaction.deleteMany({ where });
  await db.recurringRule.deleteMany({ where });
  await db.budget.deleteMany({ where });
  await db.importBatch.deleteMany({ where });
  await db.refreshToken.deleteMany({ where });
  await db.account.deleteMany({ where });
  await db.category.deleteMany({ where });
  await db.user.delete({ where: { id: existing.id } });
}

async function insertTransactions(db: Db, userId: string, rows: TransactionCreate[]) {
  if (rows.length === 0) return;
  await db.transaction.createMany({
    data: rows.map((row) => ({ ...transactionData(row), userId })),
  });
}

/**
 * Lands each complete month's savings rate on its drawn target: extra shopping when the month
 * saved more than the target, extra freelance income when it saved less.
 */
async function adjustSavingsRates(
  db: Db,
  refs: Refs,
  userId: string,
  months: MonthKey[],
  targetRates: number[],
  random: Random,
) {
  const complete = months.slice(0, -1);
  const [first, last] = [complete[0], complete.at(-1)];
  if (!first || !last) return;
  const { points } = await incomeVsExpense(db, userId, { from: first, to: last });
  const rows: TransactionCreate[] = [];
  points.forEach((point, index) => {
    const target = (targetRates[index] ?? 15) / 100;
    const day = dayOf(point.month, random.int(16, 27));
    const wanted = Math.round(point.income * (1 - target));
    const missing = wanted - point.expense;
    if (missing > 3_000) {
      rows.push({
        type: 'expense',
        date: day,
        accountId: refs.accounts.card,
        categoryId: categoryOf(refs, 'Compras'),
        amount: cents(missing),
        description: random.pick([
          'Amazon.com.br',
          'Mercado Livre',
          'Leroy Merlin',
          'Renner',
          'Shopee',
        ]),
      });
    } else if (missing < -3_000) {
      rows.push({
        type: 'income',
        date: day,
        accountId: refs.accounts.nubank,
        categoryId: categoryOf(refs, 'Freelance'),
        amount: cents(Math.round(point.expense / (1 - target)) - point.income),
        description: 'Freelance — consultoria',
      });
    }
  });
  await insertTransactions(db, userId, rows);
}

/** Pays each month's card bill on day 15 of the next month, from the checking account. */
async function payCardBills(db: Db, refs: Refs, userId: string, months: MonthKey[], today: string) {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) return;
  const spent = await db.transaction.groupBy({
    by: ['date'],
    where: {
      userId,
      type: 'expense',
      accountId: refs.accounts.card,
      date: { gte: `${first}-01`, lt: monthDateRange(last).end },
    },
    _sum: { amount: true },
  });
  const byMonth = new Map<string, bigint>();
  for (const row of spent) {
    const month = row.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0n) + sumOrZero(row._sum.amount));
  }
  const rows: TransactionCreate[] = [];
  months.slice(1).forEach((month, index) => {
    const bill = byMonth.get(months[index] ?? '') ?? 0n;
    const date = `${month}-15`;
    if (bill === 0n || date > today) return;
    rows.push({
      type: 'transfer',
      date,
      accountId: refs.accounts.nubank,
      toAccountId: refs.accounts.card,
      amount: fromDbCents(bill),
      description: 'Pagamento da fatura — Cartão Inter',
    });
  });
  await insertTransactions(db, userId, rows);
}

async function createRefs(db: Db, userId: string): Promise<Refs> {
  const wallet = await db.account.findFirstOrThrow({ where: { userId }, select: { id: true } });
  const created: Partial<Record<keyof typeof ACCOUNTS, string>> = {};
  for (const [key, input] of Object.entries(ACCOUNTS) as [
    keyof typeof ACCOUNTS,
    AccountCreateInput,
  ][]) {
    created[key] = (await createAccount(db, userId, accountCreateSchema.parse(input))).id;
  }
  const { nubank, savings, card } = created;
  if (!nubank || !savings || !card) throw new Error('Falha ao criar as contas do demo');
  const categories = await db.category.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  return {
    accounts: { wallet: wallet.id, nubank, savings, card },
    categories: new Map(categories.map((category) => [category.name, category.id])),
  };
}

async function createRecurringRules(db: Db, refs: Refs, userId: string, firstMonth: MonthKey) {
  const rules: RecurringCreateInput[] = [
    {
      rule: { frequency: 'monthly', startDate: `${firstMonth}-10`, dayOfMonth: 10 },
      template: {
        type: 'expense',
        accountId: refs.accounts.nubank,
        categoryId: categoryOf(refs, 'Moradia'),
        amount: RENT,
        description: 'Aluguel — Imobiliária Lar',
      },
    },
    ...SUBSCRIPTIONS.map((subscription): RecurringCreateInput => ({
      rule: {
        frequency: 'monthly',
        startDate: dayOf(firstMonth, subscription.day),
        dayOfMonth: subscription.day,
      },
      template: {
        type: 'expense',
        accountId: refs.accounts[subscription.account],
        categoryId: categoryOf(refs, 'Assinaturas'),
        amount: subscription.amount,
        description: subscription.description,
      },
    })),
  ];
  for (const input of rules) await createRecurring(db, userId, recurringCreateSchema.parse(input));
}

async function createBudgets(db: Db, refs: Refs, userId: string, months: MonthKey[]) {
  await db.budget.createMany({
    data: months.flatMap((month, index) =>
      Object.entries(BUDGETS).map(([name, amount]) => ({
        userId,
        month,
        categoryId: categoryOf(refs, name),
        amount: toDbCents(cents(amount(index))),
      })),
    ),
  });
}

async function summarize(
  db: Db,
  userId: string,
  months: MonthKey[],
  today: string,
): Promise<DemoSummary> {
  const first = months[0];
  const current = months.at(-1);
  if (!first || !current) throw new Error('Sem meses para resumir');
  const [series, accounts, dates, month] = await Promise.all([
    incomeVsExpense(db, userId, { from: first, to: current }),
    listAccounts(db, userId, { includeArchived: false }),
    db.transaction.findMany({ where: { userId }, select: { date: true } }),
    monthSummary(db, userId, { month: current }),
  ]);
  const counts = new Map<string, number>();
  for (const { date } of dates)
    counts.set(date.slice(0, 7), (counts.get(date.slice(0, 7)) ?? 0) + 1);
  return {
    userId,
    today,
    months: series.points.map((point) => ({
      month: point.month,
      transactions: counts.get(point.month) ?? 0,
      income: point.income,
      expense: point.expense,
      savingsRate: percentOf(point.net, point.income),
    })),
    totalBalance: cents(accounts.reduce((sum, account) => sum + account.balance, 0)),
    balances: accounts.map((account) => ({ name: account.name, balance: account.balance })),
    current: { month: current, income: month.income, expense: month.expense },
  };
}

/**
 * Recreates the demo user from scratch (only its data is deleted) with six months of
 * transactions up to `today` ("YYYY-MM-DD", São Paulo), budgets and recurring rules. The PRNG has
 * a fixed seed, so the same `today` always yields the same data.
 */
export async function seedDemo(
  prisma: PrismaClient,
  { today, passwords }: { today: string; passwords: PasswordHasher },
): Promise<DemoSummary> {
  const months = lastNMonths(DEMO_MONTHS, monthKey(today.slice(0, 7)));
  const firstMonth = months[0];
  if (!firstMonth) throw new Error('Sem meses para gerar');
  const passwordHash = await passwords.hash(DEMO_USER.password);
  const random = createRandom(DEMO_SEED);

  return prisma.$transaction(
    async (tx) => {
      await deleteDemoUser(tx, DEMO_USER.email);
      const user = await createUserWithDefaults(tx, {
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        passwordHash,
      });
      const refs = await createRefs(tx, user.id);

      const { rows, targetRates } = generateMonths(random, refs, months, today);
      await insertTransactions(tx, user.id, rows);
      await createRecurringRules(tx, refs, user.id, firstMonth);
      await syncDueRecurring(tx, user.id, today);
      await adjustSavingsRates(tx, refs, user.id, months, targetRates, random);
      await payCardBills(tx, refs, user.id, months, today);
      await createBudgets(tx, refs, user.id, months);

      return summarize(tx, user.id, months, today);
    },
    { timeout: 60_000 },
  );
}
