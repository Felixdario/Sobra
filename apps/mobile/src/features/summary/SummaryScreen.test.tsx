import { previousMonth, toMonthKey } from '@financas/shared';
import { screen } from '@testing-library/react-native';
import { budgets, ids, monthSummary, spending, tokens, user } from '../../test/fixtures';
import { renderWithServices, type Routes } from '../../test/render';
import { SummaryScreen } from './SummaryScreen';

const current = toMonthKey(new Date());
const closed = previousMonth(current);

function routesFor(month: string, summary: ReturnType<typeof monthSummary>): Routes {
  return {
    'GET /me': { body: user },
    'GET /summary/month': { body: summary },
    'GET /summary/spending-by-category': {
      body: spending(month, [
        [ids.mercado, 300_000],
        [ids.transporte, 120_000],
      ]),
    },
    'GET /summary/budget-vs-actual': {
      body: budgets(month, [
        [ids.mercado, 250_000, 300_000],
        [ids.transporte, 200_000, 120_000],
      ]),
    },
  };
}

describe('resumo do mês', () => {
  it('mês fechado: sobra, régua e orçamento estourado com a palavra "acima"', async () => {
    const summary = monthSummary(closed, previousMonth(closed), {
      income: 700_000,
      expense: 420_000,
      previousIncome: 700_000,
      previousExpense: 500_000,
    });
    const { calls } = await renderWithServices(
      <SummaryScreen initialMonth={closed} />,
      routesFor(closed, summary),
      tokens,
    );

    expect(await screen.findByText('Sobrou')).toBeTruthy();
    expect(screen.getByTestId('headline-figure')).toHaveTextContent(/^R\$.2\.800,00$/);
    expect(screen.getByText(/taxa de poupança 40,0%/)).toBeTruthy();
    expect(screen.getByText('mês fechado')).toBeTruthy();
    expect(await screen.findByText(/^Sobra R\$.2\.800,00$/)).toBeTruthy();
    expect(await screen.findByText(/^R\$.500,00 acima$/)).toBeTruthy();
    expect(screen.getByText(/^Restam R\$.800,00$/)).toBeTruthy();
    expect(calls.find((call) => call.path === '/summary/month')?.query.get('month')).toBe(closed);
  });

  it('mês corrente parcial antes do salário: "Gasto até agora", sem taxa negativa', async () => {
    const summary = {
      ...monthSummary(current, closed, { income: 5_500, expense: 124_000 }),
      savingsRate: -2154.5,
    };
    await renderWithServices(
      <SummaryScreen initialMonth={current} />,
      routesFor(current, summary),
      tokens,
    );

    expect(await screen.findByText('Gasto até agora')).toBeTruthy();
    expect(screen.getByTestId('headline-figure')).toHaveTextContent(/^−R\$.1\.240,00$/);
    expect(
      screen.getByText(
        /^Até agora: R\$.55,00 recebidos, R\$.1\.240,00 gastos · parcial · dia \d+ de \d+$/,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/taxa de poupança/)).toBeNull();
    expect(screen.queryByText(/2\.154/)).toBeNull();
    expect(screen.queryByText(/Faltaram/)).toBeNull();
  });

  it('mês sem lançamentos ensina o próximo passo', async () => {
    const summary = monthSummary(closed, previousMonth(closed), { income: 0, expense: 0 });
    await renderWithServices(
      <SummaryScreen initialMonth={closed} />,
      routesFor(closed, summary),
      tokens,
    );
    expect(
      await screen.findByText(/^Nenhum lançamento em .+\. Lance o primeiro gasto\.$/),
    ).toBeTruthy();
    expect(screen.getByText('Lançar gasto')).toBeTruthy();
  });

  it('erro ao carregar mostra o problema e a saída', async () => {
    await renderWithServices(
      <SummaryScreen initialMonth={closed} />,
      {
        'GET /me': { body: user },
        'GET /summary/month': {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'Falhou.' } },
        },
      },
      tokens,
    );
    expect(await screen.findByText(/^Não deu para carregar o resumo de/)).toBeTruthy();
    expect(screen.getByText('Tentar de novo')).toBeTruthy();
  });
});
