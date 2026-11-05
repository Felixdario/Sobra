import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import {
  accounts,
  categories,
  expense,
  ids,
  income,
  page,
  tokens,
  user,
} from '../../test/fixtures';
import { renderWithServices, type Call, type Routes } from '../../test/render';
import type { TransactionInput } from '../../test/types';
import { recentDays } from '../launch/dates';
import { TransactionsScreen } from './TransactionsScreen';

const [today = '', yesterday = ''] = recentDays(2);

const items: TransactionInput[] = [
  expense(ids.tx1, ids.mercado, ids.checking, 4_590, today),
  income(ids.tx2, ids.salario, ids.checking, 10_000, today),
  expense(ids.tx3, ids.transporte, ids.wallet, 1_000, yesterday),
];

function routes(overrides: Routes = {}, list?: (call: Call) => TransactionInput[]): Routes {
  // A tiny server: a successful DELETE removes the item from later reads, like the API.
  const deleted = new Set<string>();
  const removals = Object.fromEntries(
    items.map((item) => {
      const key = `DELETE /transactions/${item.id}`;
      const override = overrides[key];
      return [
        key,
        async (call: Call) => {
          const reply =
            typeof override === 'function' ? await override(call) : (override ?? { status: 204 });
          if ((reply.status ?? 200) < 300) deleted.add(item.id);
          return reply;
        },
      ];
    }),
  );
  return {
    'GET /me': { body: user },
    'GET /accounts': { body: accounts },
    'GET /categories': { body: categories },
    'GET /transactions': async (call) => ({
      body: page((list ? list(call) : items).filter((item) => !deleted.has(item.id))),
    }),
    ...overrides,
    ...removals,
  };
}

const listCalls = (calls: Call[]) =>
  calls.filter(
    (call) =>
      call.method === 'GET' && call.path === '/transactions' && call.query.get('pageSize') === '30',
  );

const rowAction = async (label: RegExp, actionName: string) =>
  act(async () => {
    fireEvent(screen.getByLabelText(label), 'accessibilityAction', { nativeEvent: { actionName } });
  });

describe('aba Transações', () => {
  it('agrupa por dia com o total do dia e valores com sinal', async () => {
    await renderWithServices(<TransactionsScreen />, routes(), tokens);

    expect(await screen.findByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Ontem')).toBeTruthy();
    expect(screen.getByTestId('day-total-Hoje')).toHaveTextContent(/^\+R\$.54,10$/);
    expect(screen.getByTestId('day-total-Ontem')).toHaveTextContent(/^−R\$.10,00$/);
    expect(within(screen.getByTestId('row-Mercado')).getByText(/^−R\$.45,90$/)).toBeTruthy();
    expect(within(screen.getByTestId('row-Mercado')).getByText('Mercado · Nubank')).toBeTruthy();
  });

  it('busca com debounce: uma consulta com o termo, não uma por letra', async () => {
    const { calls } = await renderWithServices(<TransactionsScreen />, routes(), tokens);
    await screen.findByText('Hoje');

    await fireEvent.changeText(screen.getByTestId('search'), 'm');
    await fireEvent.changeText(screen.getByTestId('search'), 'mer');
    await fireEvent.changeText(screen.getByTestId('search'), 'mercado');
    await waitFor(() =>
      expect(listCalls(calls).some((call) => call.query.get('search') === 'mercado')).toBe(true),
    );
    expect(listCalls(calls).filter((call) => call.query.has('search'))).toHaveLength(1);
  });

  it('filtro por conta e categoria chama a API com os ids e mostra chips ativos que limpam', async () => {
    const { calls } = await renderWithServices(<TransactionsScreen />, routes(), tokens);
    await screen.findByText('Hoje');

    await fireEvent.press(screen.getByTestId('open-filters'));
    await fireEvent.press(await screen.findByTestId('filter-account-Carteira'));
    await fireEvent.press(screen.getByTestId('filter-category-Transporte'));
    await waitFor(() => {
      const last = listCalls(calls).at(-1);
      expect(last?.query.get('accountId')).toBe(ids.wallet);
      expect(last?.query.get('categoryId')).toBe(ids.transporte);
    });
    await fireEvent.press(screen.getByTestId('filters-done'));

    expect(screen.getByLabelText('Remover filtro Carteira')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Remover filtro Carteira'));
    await waitFor(() => {
      const last = listCalls(calls).at(-1);
      expect(last?.query.has('accountId')).toBe(false);
      expect(last?.query.get('categoryId')).toBe(ids.transporte);
    });
  });

  it('vazio com filtros oferece limpar; sem filtros, lançar', async () => {
    await renderWithServices(
      <TransactionsScreen />,
      routes({}, (call) => (call.query.has('search') ? [] : [])),
      tokens,
    );
    expect(
      await screen.findByText('Nenhum lançamento ainda. Lance o primeiro gasto.'),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('search'), 'xyz');
    expect(await screen.findByText('Nada encontrado com esses filtros.')).toBeTruthy();
    expect(screen.getByText('Limpar filtros')).toBeTruthy();
  });

  it('apagar é otimista e "Desfazer" recria a mesma transação', async () => {
    const { calls } = await renderWithServices(
      <TransactionsScreen />,
      routes({
        'DELETE /transactions/00000000-0000-4000-8000-0000000000f1': { status: 204 },
        'POST /transactions': {
          status: 201,
          body: expense(ids.created, ids.mercado, ids.checking, 4_590, today),
        },
      }),
      tokens,
    );
    await screen.findByTestId('row-Mercado');

    await rowAction(/^Mercado, Mercado · Nubank/, 'delete');
    await waitFor(() => expect(screen.queryByTestId('row-Mercado')).toBeNull());
    expect(await screen.findByText('“Mercado” apagada.')).toBeTruthy();
    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true));

    await fireEvent.press(screen.getByText('Desfazer'));
    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      type: 'expense',
      accountId: ids.checking,
      categoryId: ids.mercado,
      amount: 4_590,
      description: 'Mercado',
      date: today,
    });
  });

  it('se apagar falha, a linha volta e o erro aparece', async () => {
    await renderWithServices(
      <TransactionsScreen />,
      routes({
        'DELETE /transactions/00000000-0000-4000-8000-0000000000f1': {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'Erro no servidor.' } },
        },
      }),
      tokens,
    );
    await screen.findByTestId('row-Mercado');

    await rowAction(/^Mercado, Mercado · Nubank/, 'delete');
    expect(await screen.findByText(/^Não deu para apagar “Mercado”/)).toBeTruthy();
    expect(await screen.findByTestId('row-Mercado')).toBeTruthy();
  });

  it('editar pela ação de acessibilidade abre a folha e manda o PATCH certo', async () => {
    const { calls } = await renderWithServices(
      <TransactionsScreen />,
      routes({
        'PATCH /transactions/00000000-0000-4000-8000-0000000000f1': async (call) => ({
          body: {
            ...expense(ids.tx1, ids.lazer, ids.checking, 4_599, today),
            ...(call.body as object),
          },
        }),
      }),
      tokens,
    );
    await screen.findByTestId('row-Mercado');

    await rowAction(/^Mercado, Mercado · Nubank/, 'edit');
    expect(await screen.findByText('Salvar alterações')).toBeTruthy();
    expect(screen.getByTestId('amount')).toHaveTextContent(/^−R\$.45,90$/);
    await fireEvent.press(screen.getByTestId('key-backspace'));
    await fireEvent.press(screen.getByTestId('key-9'));
    await fireEvent.press(await screen.findByTestId('category-Lazer'));
    await fireEvent.press(screen.getByTestId('save'));

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true));
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      type: 'expense',
      accountId: ids.checking,
      categoryId: ids.lazer,
      amount: 4_599,
      date: today,
      description: 'Mercado',
      notes: null,
    });
  });

  it('toque longo abre o menu com Editar e Apagar', async () => {
    const { calls } = await renderWithServices(
      <TransactionsScreen />,
      routes({ 'DELETE /transactions/00000000-0000-4000-8000-0000000000f3': { status: 204 } }),
      tokens,
    );
    await screen.findByTestId('row-Transporte');

    await rowAction(/^Transporte, Transporte · Carteira/, 'longpress');
    await fireEvent.press(await screen.findByTestId('menu-delete'));
    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true));
    await waitFor(() => expect(screen.queryByTestId('row-Transporte')).toBeNull());
  });

  it('pagina ao chegar no fim da lista', async () => {
    const second = [expense(ids.created, ids.lazer, ids.checking, 3_000, '2026-01-10')];
    const { calls } = await renderWithServices(
      <TransactionsScreen />,
      {
        ...routes(),
        'GET /transactions': async (call) => {
          const pageNumber = Number(call.query.get('page') ?? '1');
          const body = page(pageNumber === 1 ? items : second);
          return { body: { ...body, page: pageNumber, total: 4, totalPages: 2 } };
        },
      },
      tokens,
    );
    await screen.findByText('Hoje');

    await act(async () => {
      fireEvent(screen.getByTestId('transactions-list'), 'onEndReached');
    });
    expect(await screen.findByTestId('row-Lazer')).toBeTruthy();
    expect(listCalls(calls).map((call) => call.query.get('page'))).toEqual(['1', '2']);
  });
});
