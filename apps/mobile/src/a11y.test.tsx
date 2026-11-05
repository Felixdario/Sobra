import { fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { RECENT_PARAMS, useLaunch } from './features/launch/LaunchSheetProvider';
import { SummaryScreen } from './features/summary/SummaryScreen';
import { TransactionsScreen } from './features/transactions/TransactionsScreen';
import { worstCase } from './dev/scenarioData';
import { replyFor } from './dev/scenarios';
import { accounts, categories, page, recent, tokens, user } from './test/fixtures';
import { renderWithServices, type Call, type Routes } from './test/render';
import { Button } from './ui/Button';

/*
 * Screen reader contract of the main screens: roles, names, values and announcements. These are
 * what VoiceOver/TalkBack read; a regression here is invisible on screen.
 */

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
beforeEach(() => announce.mockClear());

function LaunchTrigger() {
  const launch = useLaunch();
  return <Button testID="launch" label="Lançar" onPress={() => launch.open()} />;
}

const launchRoutes: Routes = {
  'GET /me': { body: user },
  'GET /accounts': { body: accounts },
  'GET /categories': { body: categories },
  'GET /transactions': async (call) => ({
    body: call.query.get('pageSize') === String(RECENT_PARAMS.pageSize) ? page(recent) : page([]),
  }),
};

describe('folha de lançar', () => {
  it('o teclado próprio é lido tecla a tecla e o valor novo é anunciado', async () => {
    await renderWithServices(<LaunchTrigger />, launchRoutes, tokens);
    await fireEvent.press(screen.getByTestId('launch'));
    expect(announce).toHaveBeenCalledWith('Lançar gasto');

    for (const name of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Dois zeros']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    const backspace = screen.getByRole('button', { name: 'Apagar último dígito' });
    expect(backspace.props.accessibilityHint).toBe('Toque e segure para zerar');

    await fireEvent.press(screen.getByRole('button', { name: '1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Dois zeros' }));
    expect(announce).toHaveBeenLastCalledWith('1 real');
    expect(screen.getByLabelText('Valor: 1 real')).toBeTruthy();
  });

  it('tecla recusada no limite é anunciada (não fica só no háptico)', async () => {
    await renderWithServices(<LaunchTrigger />, launchRoutes, tokens);
    await fireEvent.press(screen.getByTestId('launch'));
    for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByTestId('key-9'));
    await fireEvent.press(screen.getByTestId('key-9'));
    expect(announce).toHaveBeenLastCalledWith('Valor máximo: 99.999.999 reais e 99 centavos.');
  });

  it('tipo, categorias e conta são grupos de opção única; salvar diz o que falta', async () => {
    await renderWithServices(<LaunchTrigger />, launchRoutes, tokens);
    await fireEvent.press(screen.getByTestId('launch'));
    expect(screen.getByRole('radio', { name: 'Despesa', checked: true })).toBeTruthy();
    expect(await screen.findByRole('radio', { name: 'Transporte', checked: false })).toBeTruthy();
    const save = screen.getByRole('button', { name: 'Salvar despesa' });
    expect(save.props.accessibilityHint).toBe('Digite o valor.');
    expect(screen.getByLabelText('Lançar gasto').props.onAccessibilityEscape).toBeInstanceOf(
      Function,
    );
  });
});

function scenarioRoutes(): Routes {
  const keys = [
    'GET /me',
    'GET /accounts',
    'GET /categories',
    'GET /transactions',
    'GET /summary/month',
    'GET /summary/spending-by-category',
    'GET /summary/budget-vs-actual',
  ];
  return Object.fromEntries(
    keys.map((key) => {
      const [method = 'GET', path = '/'] = key.split(' ');
      return [key, async (call: Call) => replyFor(worstCase, method, path, call.query, call.body)];
    }),
  );
}

describe('resumo', () => {
  it('cabeçalhos, número principal, KPIs agrupados, régua como imagem e orçamentos com valor', async () => {
    await renderWithServices(<SummaryScreen />, scenarioRoutes(), tokens);
    expect(
      await screen.findByLabelText(/^Gasto até agora: menos 1\.000\.000\.165 reais/),
    ).toBeTruthy();
    expect(screen.getByRole('header', { name: /de 2026$/ })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Para onde foi' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Orçamentos' })).toBeTruthy();
    expect(screen.getByLabelText(/^Despesas: menos /)).toBeTruthy();
    expect(await screen.findByRole('image', { name: /^Régua do mês\. Recebido / })).toBeTruthy();
    const budgets = screen.getAllByRole('progressbar');
    expect(budgets).toHaveLength(4);
    expect(budgets[0]?.props.accessibilityValue.text).toMatch(/reais/);
    expect(screen.getByRole('button', { name: /^Mês anterior: / })).toBeTruthy();
  });
});

describe('transações', () => {
  it('cada linha é um elemento só, lido por extenso, com ações de editar e apagar', async () => {
    await renderWithServices(<TransactionsScreen />, scenarioRoutes(), tokens);
    const row = await screen.findByLabelText(
      'Jo, Jo, Conta Corrente Conjunta Banco do Brasil Ag. 1234-5 Família, menos 1 real',
    );
    expect(row.props.accessible).toBe(true);
    expect(row.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Editar',
      'Apagar',
      'Mais ações',
    ]);
    expect(screen.getByRole('header', { name: /^Hoje, saldo do dia / })).toBeTruthy();
    expect(screen.getByLabelText('Buscar transações')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy();
  });
});
