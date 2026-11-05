import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  accounts,
  categories,
  expense,
  ids,
  page,
  recent,
  tokens,
  user,
} from '../../test/fixtures';
import { renderWithServices, type Routes } from '../../test/render';
import { Button } from '../../ui/Button';
import { todayKey } from './dates';
import { RECENT_PARAMS, useLaunch } from './LaunchSheetProvider';

function LaunchTrigger() {
  const launch = useLaunch();
  return <Button testID="launch" label="Lançar" onPress={() => launch.open()} />;
}

const baseRoutes: Routes = {
  'GET /me': { body: user },
  'GET /accounts': { body: accounts },
  'GET /categories': { body: categories },
  'GET /transactions': { body: page(recent) },
};

async function launchExpense() {
  await fireEvent.press(screen.getByTestId('launch')); // toque 1: abre o sheet com o teclado
  for (const key of ['1', '2', '5', '0']) await fireEvent.press(screen.getByTestId(`key-${key}`));
  expect(screen.getByTestId('amount')).toHaveTextContent('−R$ 12,50');
  await fireEvent.press(await screen.findByTestId('category-Transporte')); // toque 2
  await fireEvent.press(screen.getByTestId('save')); // toque 3
}

describe('lançar gasto em 3 toques', () => {
  it('abre, digita o valor, escolhe a categoria e salva com o payload certo', async () => {
    const created = expense(ids.created, ids.transporte, ids.checking, 1_250, todayKey());
    const { calls } = await renderWithServices(
      <LaunchTrigger />,
      { ...baseRoutes, 'POST /transactions': { status: 201, body: created } },
      tokens,
    );

    await launchExpense();

    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    const post = calls.find((call) => call.method === 'POST' && call.path === '/transactions');
    expect(post?.body).toEqual({
      type: 'expense',
      accountId: ids.checking,
      categoryId: ids.transporte,
      amount: 1_250,
      description: 'Transporte',
      date: todayKey(),
    });
    expect(await screen.findByText('Gasto de R$ 12,50 em Transporte lançado.')).toBeTruthy();
  });

  it('salvar fica bloqueado até ter valor e categoria', async () => {
    await renderWithServices(<LaunchTrigger />, baseRoutes, tokens);
    await fireEvent.press(screen.getByTestId('launch'));
    expect(screen.getByTestId('save')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('key-5'));
    expect(screen.getByTestId('save')).toBeDisabled();
    expect(screen.getByText('Escolha a categoria para salvar.')).toBeTruthy();
  });

  it('se a API recusa, desfaz o otimista e avisa com a saída', async () => {
    let resolve: () => void = () => {};
    const gate = new Promise<void>((done) => {
      resolve = done;
    });
    const { services, calls } = await renderWithServices(
      <LaunchTrigger />,
      {
        ...baseRoutes,
        'POST /transactions': async () => {
          await gate;
          return {
            status: 500,
            body: { error: { code: 'INTERNAL', message: 'Erro no servidor.' } },
          };
        },
      },
      tokens,
    );
    const key = services.queries.transactions.list(RECENT_PARAMS).queryKey;

    await launchExpense();
    await waitFor(() => expect(services.queryClient.getQueryData(key)?.items).toHaveLength(4));
    resolve();

    expect(await screen.findByText(/^Não deu para salvar R\$.12,50 em Transporte\./)).toBeTruthy();
    expect(screen.getByText('Tentar de novo')).toBeTruthy();
    await waitFor(() => expect(services.queryClient.getQueryData(key)?.items).toHaveLength(3));
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });
});
