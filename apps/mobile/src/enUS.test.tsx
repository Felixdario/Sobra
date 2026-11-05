import { previousMonth, toMonthKey } from '@sobra/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import type { ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { SignInScreen } from './features/auth/SignInScreen';
import { recentDays, todayKey } from './features/launch/dates';
import { RECENT_PARAMS, useLaunch } from './features/launch/LaunchSheetProvider';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { SummaryScreen } from './features/summary/SummaryScreen';
import { TransactionsScreen } from './features/transactions/TransactionsScreen';
import {
  accounts,
  budgets,
  categories,
  expense,
  ids,
  income,
  monthSummary,
  page,
  recent,
  spending,
  tokens,
  user,
} from './test/fixtures';
import { renderWithServices, type Call, type Routes } from './test/render';
import type { CategoryInput, TransactionInput } from './test/types';
import { Button } from './ui/Button';

/*
 * The same screens for a user whose preference is English (US) and US dollars: texts, months,
 * amounts ("$12.50"), dates ("Today") and what screen readers say, plus the switch in Settings.
 */

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
beforeEach(() => announce.mockClear());

const englishUser = { ...user, locale: 'en-US', currency: 'USD' };

/** Default categories keep their systemKey, so they show in the user's language. */
const SYSTEM_KEYS: Record<string, CategoryInput['systemKey']> = {
  [ids.mercado]: 'groceries',
  [ids.transporte]: 'transport',
  [ids.lazer]: 'leisure',
  [ids.salario]: 'salary',
};
const withKeys = categories.map((item) => ({ ...item, systemKey: SYSTEM_KEYS[item.id] ?? null }));
const keyed = (tx: TransactionInput): TransactionInput =>
  tx.category
    ? ({
        ...tx,
        category: { ...tx.category, systemKey: SYSTEM_KEYS[tx.category.id] ?? null },
      } as TransactionInput)
    : tx;

const current = toMonthKey(new Date());
const closed = previousMonth(current);

describe('resumo em en-US / USD', () => {
  it('mês, rótulos e valores em inglês com $ e separadores americanos', async () => {
    const summary = monthSummary(closed, previousMonth(closed), {
      income: 700_000,
      expense: 420_000,
      previousIncome: 700_000,
      previousExpense: 500_000,
    });
    await renderWithServices(
      <SummaryScreen initialMonth={closed} />,
      {
        'GET /me': { body: englishUser },
        'GET /summary/month': { body: summary },
        'GET /summary/spending-by-category': {
          body: spending(closed, [
            [ids.mercado, 300_000],
            [ids.transporte, 120_000],
          ]),
        },
        'GET /summary/budget-vs-actual': {
          body: budgets(closed, [
            [ids.mercado, 250_000, 300_000],
            [ids.transporte, 200_000, 120_000],
          ]),
        },
      },
      tokens,
    );

    expect(await screen.findByText('Left over')).toBeTruthy();
    expect(screen.getByTestId('headline-figure')).toHaveTextContent('$2,800.00');
    expect(screen.getByText('of $7,000.00 received · savings rate 40.0%')).toBeTruthy();
    expect(screen.getByText(/^\+\$800\.00 more than in [A-Z][a-z]+$/)).toBeTruthy();
    expect(screen.getByText('closed month')).toBeTruthy();
    expect(screen.getByRole('header', { name: /^[A-Z][a-z]+ \d{4}$/ })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Where it went' })).toBeTruthy();
    expect(screen.getByLabelText('Income: 7,000 dollars')).toBeTruthy();
    expect(await screen.findByLabelText(/^Month ruler\..*Left \$2,800\.00\.$/)).toBeTruthy();
    expect(await screen.findByText('$500.00 over')).toBeTruthy();
    expect(screen.getByText('$800.00 left')).toBeTruthy();
    expect(screen.queryByText(/R\$|Sobr|mês/)).toBeNull();
  });
});

function LaunchTrigger() {
  const launch = useLaunch();
  return <Button testID="launch" label="Add" onPress={() => launch.open()} />;
}

describe('lançar em en-US / USD', () => {
  it('teclado em centavos: 1, 2, 5, 0 vira $12.50, lido em inglês; categoria traduzida no payload', async () => {
    const created = expense(ids.created, ids.transporte, ids.checking, 1_250, todayKey());
    const { calls } = await renderWithServices(
      <LaunchTrigger />,
      {
        'GET /me': { body: englishUser },
        'GET /accounts': { body: accounts },
        'GET /categories': { body: withKeys },
        'GET /transactions': async (call: Call) => ({
          body:
            call.query.get('pageSize') === String(RECENT_PARAMS.pageSize)
              ? page(recent.map(keyed))
              : page([]),
        }),
        'POST /transactions': { status: 201, body: keyed(created) },
      },
      tokens,
    );
    await screen.findByText('Add');
    await waitFor(() => expect(screen.getByTestId('launch')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('launch'));
    expect(announce).toHaveBeenCalledWith('Add expense');
    expect(screen.getByRole('radio', { name: 'Expense', checked: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Double zero' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete last digit' }).props.accessibilityHint).toBe(
      'Touch and hold to clear',
    );

    for (const key of ['1', '2', '5', '0']) await fireEvent.press(screen.getByTestId(`key-${key}`));
    expect(screen.getByTestId('amount')).toHaveTextContent('−$12.50');
    expect(announce).toHaveBeenLastCalledWith('12 dollars and 50 cents');
    expect(screen.getByLabelText('Amount: 12 dollars and 50 cents')).toBeTruthy();
    await screen.findByTestId('category-Transportation');
    expect(screen.getByRole('button', { name: 'Save expense' }).props.accessibilityHint).toBe(
      'Pick a category.',
    );
    expect(screen.getByLabelText(/^Date: Today\. Change date$/)).toBeTruthy();

    await fireEvent.press(await screen.findByTestId('category-Transportation'));
    await fireEvent.press(screen.getByTestId('save'));
    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
      amount: 1_250,
      description: 'Transportation',
    });
    expect(await screen.findByText('Expense of $12.50 in Transportation added.')).toBeTruthy();
  });
});

describe('transações em en-US / USD', () => {
  it('dias como Today/Yesterday, valores em $ e linha lida em inglês', async () => {
    const [today = '', yesterday = ''] = recentDays(2);
    const items = [
      expense(ids.tx1, ids.mercado, ids.checking, 4_590, today),
      income(ids.tx2, ids.salario, ids.checking, 10_000, today),
      expense(ids.tx3, ids.transporte, ids.wallet, 1_000, yesterday),
    ].map(keyed);
    await renderWithServices(
      <TransactionsScreen />,
      {
        'GET /me': { body: englishUser },
        'GET /accounts': { body: accounts },
        'GET /categories': { body: withKeys },
        'GET /transactions': { body: page(items) },
      },
      tokens,
    );

    expect(await screen.findByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByTestId('day-total-Today')).toHaveTextContent('+$54.10');
    expect(
      screen.getByRole('header', { name: 'Yesterday, day total minus 10 dollars' }),
    ).toBeTruthy();
    expect(within(screen.getByTestId('row-Mercado')).getByText('Groceries · Nubank')).toBeTruthy();
    const row = screen.getByLabelText('Mercado, Groceries, Nubank, minus 45 dollars and 90 cents');
    expect(row.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Edit',
      'Delete',
      'More actions',
    ]);
    expect(screen.getByRole('header', { name: 'Transactions' })).toBeTruthy();
    expect(screen.getByLabelText('Search transactions')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy();
  });
});

describe('entrar com o aparelho em inglês', () => {
  afterEach(() => {
    jest.mocked(getLocales).mockReset();
    jest
      .mocked(getLocales)
      .mockReturnValue([{ languageTag: 'pt-BR', languageCode: 'pt', regionCode: 'BR' }] as never);
  });

  it('antes do login usa o idioma do aparelho e traduz os erros de validação', async () => {
    jest
      .mocked(getLocales)
      .mockReturnValue([{ languageTag: 'en-GB', languageCode: 'en', regionCode: 'GB' }] as never);
    const { calls } = await renderWithServices(<SignInScreen />, {});
    expect(screen.getByText('Log it on your phone, know what’s left.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.press(screen.getByTestId('sign-in'));

    expect(await screen.findByText('Invalid email')).toBeTruthy();
    expect(screen.getByText('Enter your password')).toBeTruthy();
    expect(calls.filter((call) => call.path === '/auth/login')).toHaveLength(0);
  });

  it('senha errada: mensagem própria do login em inglês', async () => {
    jest
      .mocked(getLocales)
      .mockReturnValue([{ languageTag: 'en-US', languageCode: 'en', regionCode: 'US' }] as never);
    await renderWithServices(<SignInScreen />, {
      'POST /auth/login': {
        status: 401,
        body: { error: { code: 'UNAUTHORIZED', message: 'E-mail ou senha incorretos' } },
      },
    });
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong1234');
    await fireEvent.press(screen.getByTestId('sign-in'));
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
  });
});

describe('Ajustes: idioma e moeda', () => {
  it('trocar pela UI chama a API e a tela muda na hora', async () => {
    let me: Record<string, unknown> = { ...user, locale: 'pt-BR', currency: 'BRL' };
    const routes: Routes = {
      'GET /me': async () => ({ body: me }),
      'PATCH /me/preferences': async (call) => {
        me = { ...me, ...(call.body as object) };
        return { body: me };
      },
    };
    const { calls } = await renderWithServices(<SettingsScreen />, routes, tokens);

    expect(await screen.findByRole('header', { name: 'Idioma e moeda' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Português (Brasil)', checked: true })).toBeTruthy();
    expect(screen.getByText(/não converte câmbio/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('locale-en-US'));
    expect(await screen.findByRole('header', { name: 'Language and currency' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText(/Sobra doesn’t convert|does not convert|exchange/)).toBeTruthy();
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ locale: 'en-US' }),
    );

    await fireEvent.press(screen.getByTestId('currency-USD'));
    await waitFor(() =>
      expect(calls.filter((call) => call.method === 'PATCH').at(-1)?.body).toEqual({
        currency: 'USD',
      }),
    );
    expect(screen.getByRole('radio', { name: 'US dollar ($)', checked: true })).toBeTruthy();
  });

  it('se a API recusa, volta a preferência anterior e avisa', async () => {
    await renderWithServices(
      <SettingsScreen />,
      {
        'GET /me': { body: user },
        'PATCH /me/preferences': {
          status: 500,
          body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
        },
      },
      tokens,
    );
    await fireEvent.press(await screen.findByTestId('locale-en-US'));
    expect(
      await screen.findByText(/^Não deu para salvar a preferência\. Erro no servidor/),
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Português (Brasil)', checked: true })).toBeTruthy();
  });
});
