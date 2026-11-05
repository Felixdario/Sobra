import { screen, waitFor, within } from '@testing-library/react-native';
import { SummaryScreen } from '../features/summary/SummaryScreen';
import { TransactionsScreen } from '../features/transactions/TransactionsScreen';
import { gridColumns } from '../features/launch/CategoryGrid';
import { tokens } from '../test/fixtures';
import { renderWithServices, type Call, type Routes } from '../test/render';
import { LONG_DESCRIPTION, newUser, worstCase, type ScenarioData } from './scenarioData';
import { replyFor } from './scenarios';

/*
 * break-ui regression: the worst-case scenario from Ajustes (dev) rendered through the same fake
 * API the screens use. Each case is a break that was found and fixed (docs/polimento-mobile.md).
 */

const PATHS = [
  'GET /me',
  'GET /accounts',
  'GET /categories',
  'GET /transactions',
  'GET /summary/month',
  'GET /summary/spending-by-category',
  'GET /summary/budget-vs-actual',
];

function scenarioRoutes(data: ScenarioData): Routes {
  return Object.fromEntries(
    PATHS.map((key) => {
      const [method = 'GET', path = '/'] = key.split(' ');
      return [key, async (call: Call) => replyFor(data, method, path, call.query, call.body)];
    }),
  );
}

describe('pior caso no resumo', () => {
  it('bilhões aparecem inteiros: o número principal desce de tamanho em vez de ser cortado', async () => {
    await renderWithServices(<SummaryScreen />, scenarioRoutes(worstCase), tokens);
    const figure = await screen.findByTestId('headline-figure');
    expect(figure).toHaveTextContent('−R$ 1.000.000.165,90');
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(screen.getByLabelText('Receitas: 1.000.000.000 reais')).toBeTruthy();
    expect(
      screen.getByLabelText('Saldo em contas: menos 999.999.999 reais e 99 centavos'),
    ).toBeTruthy();
  });

  it('orçamento 1000% estourado diz quanto passou, com o percentual inteiro', async () => {
    await renderWithServices(<SummaryScreen />, scenarioRoutes(worstCase), tokens);
    expect(await screen.findByText(/^R\$.900,00 acima$/)).toBeTruthy();
    expect(screen.getByText('1.000,0%')).toBeTruthy();
    const bar = screen.getByLabelText('Manutençãoautomotivapreventivaecorretiva');
    expect(bar.props.accessibilityValue).toMatchObject({ now: 100, max: 100 });
    expect(bar.props.accessibilityValue.text).toMatch(/acima do orçamento/);
  });

  it('usuário novo: sem lançamentos, o resumo ensina o próximo passo', async () => {
    await renderWithServices(<SummaryScreen />, scenarioRoutes(newUser), tokens);
    expect(await screen.findByText(/^Nenhum lançamento em /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lançar gasto' })).toBeTruthy();
  });

  it('erro 500: diz o que falhou e oferece tentar de novo', async () => {
    const routes = Object.fromEntries(
      PATHS.map((key) => [
        key,
        {
          status: 500,
          body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
        },
      ]),
    );
    await renderWithServices(<SummaryScreen />, routes, tokens);
    expect(await screen.findByText(/^Não deu para carregar o resumo de /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy();
  });
});

describe('pior caso na lista', () => {
  it('descrição de 120 caracteres, HTML literal e valores extremos em linhas inteiras', async () => {
    await renderWithServices(<TransactionsScreen />, scenarioRoutes(worstCase), tokens);
    const row = await screen.findByTestId(`row-${LONG_DESCRIPTION}`);
    expect(within(row).getByText(LONG_DESCRIPTION).props.numberOfLines).toBe(2);
    expect(within(row).getByTestId('row-amount')).toHaveTextContent('−R$ 999.999.999,99');
    expect(screen.getByText('<b>Mensalidade</b> &amp; material')).toBeTruthy();
    expect(screen.getByLabelText(/^Venda da empresa 🎉, .*1\.000\.000\.000 reais$/)).toBeTruthy();
  });

  it('sem rede: avisa e oferece tentar de novo', async () => {
    const routes: Routes = {
      ...scenarioRoutes(worstCase),
      'GET /transactions': async () => {
        throw new TypeError('Network request failed');
      },
    };
    await renderWithServices(<TransactionsScreen />, routes, tokens);
    expect(
      await screen.findByText('Sem conexão. Não deu para carregar as transações.'),
    ).toBeTruthy();
  });
});

describe('texto do sistema a 2× (Dynamic Type / fonte do Android)', () => {
  it('a linha empilha título, detalhes e valor em vez de espremer o título', async () => {
    await renderWithServices(<TransactionsScreen />, scenarioRoutes(worstCase), tokens, {
      fontScale: 2,
    });
    const row = await screen.findByTestId(`row-${LONG_DESCRIPTION}`);
    expect(row).toHaveStyle({ flexDirection: 'column' });
    expect(within(row).getByText(LONG_DESCRIPTION).props.numberOfLines).toBe(3);
  });

  it('a 1× a linha continua em uma fileira', async () => {
    await renderWithServices(<TransactionsScreen />, scenarioRoutes(worstCase), tokens);
    await waitFor(() => expect(screen.getByTestId(`row-${LONG_DESCRIPTION}`)).toBeTruthy());
    expect(screen.getByTestId(`row-${LONG_DESCRIPTION}`)).not.toHaveStyle({
      flexDirection: 'column',
    });
  });

  it('a grade de categorias perde colunas para os nomes caberem', () => {
    expect([1, 1.3, 1.5, 2, 3].map((scale) => gridColumns(scale))).toEqual([4, 4, 3, 2, 2]);
  });

  it('uma palavra longa demais para o bloco ("Subscriptions") tira uma coluna em vez de quebrar a palavra', () => {
    const fit = { width: 358, gap: 8, padding: 10, fontSize: 13 };
    expect(gridColumns(1, { ...fit, longestWord: 12 })).toBe(4); // "Restaurantes"
    expect(gridColumns(1, { ...fit, longestWord: 13 })).toBe(3); // "Subscriptions"
    expect(gridColumns(2, { ...fit, longestWord: 40 })).toBe(2);
  });
});
