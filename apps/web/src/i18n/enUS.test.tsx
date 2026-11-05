import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { dashboardRoutes, setSessionCookie, tokens, user } from '../test/fakeApi';
import { baseRoutes, expense, ids, income, ok, page, transfer } from '../test/fixtures';
import type { FakeRoutes } from '../test/fakeApi';
import { setBrowserLanguages } from '../test/languages';
import { renderApp } from '../test/renderApp';

const english = { ...user, locale: 'en-US', currency: 'USD' };

/** The dashboard fixtures for a user who picked en-US and USD. */
function englishDashboard(): FakeRoutes {
  return { ...dashboardRoutes(), 'GET /me': () => ok(english) };
}

describe('en-US: entrar e criar conta', () => {
  it('ao entrar, vale o idioma do usuário; ao sair, volta o do navegador', async () => {
    renderApp(
      {
        ...englishDashboard(),
        'POST /auth/login': () => {
          setSessionCookie();
          return { status: 200, body: { user: english, tokens } };
        },
        'POST /auth/logout': () => ({ status: 204 }),
      },
      { path: '/entrar' },
    );
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText('E-mail'), 'demo@sobra.dev');
    await ui.type(screen.getByLabelText('Senha'), 'demo1234');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
    await ui.click(screen.getAllByRole('button', { name: 'Sign out' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Entrar no Sobra' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('antes de entrar, segue o idioma do navegador e traduz validação e erro da API', async () => {
    setBrowserLanguages(['en-GB', 'pt-BR']);
    const { requests } = renderApp(
      {
        'POST /auth/login': () => ({
          status: 401,
          body: { error: { code: 'UNAUTHORIZED', message: 'E-mail ou senha incorretos' } },
        }),
      },
      { path: '/entrar' },
    );
    const ui = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Sign in to Sobra' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
    expect(document.title).toBe('Sign in to Sobra · Sobra');
    await ui.type(screen.getByLabelText('Email'), 'not-an-email');
    await ui.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await ui.clear(screen.getByLabelText('Email'));
    await ui.type(screen.getByLabelText('Email'), 'demo@sobra.dev');
    await ui.type(screen.getByLabelText('Password'), 'wrong-one');
    await ui.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
  });

  it('o cadastro manda o idioma do navegador e mostra as regras do shared em inglês', async () => {
    setBrowserLanguages(['en-US']);
    const { requests } = renderApp(
      {
        ...englishDashboard(),
        'POST /auth/register': () => {
          setSessionCookie();
          return { status: 201, body: { user: english, tokens } };
        },
      },
      { path: '/criar-conta' },
    );
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText('Password'), 'short');
    await ui.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText('The password must be at least 8 characters'),
    ).toBeInTheDocument();

    await ui.type(screen.getByLabelText('Name'), 'Ana');
    await ui.type(screen.getByLabelText('Email'), 'ana@sobra.dev');
    await ui.type(screen.getByLabelText('Password'), '123');
    await ui.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(requests.find((r) => r.path === '/auth/register')?.body).toMatchObject({
        email: 'ana@sobra.dev',
        locale: 'en-US',
      }),
    );
  });
});

describe('en-US + USD: painel', () => {
  it('KPIs, mês e variações em inglês e em dólar', async () => {
    renderApp(englishDashboard(), { path: '/?mes=2026-10', signedIn: true });
    const card = within(await screen.findByRole('region', { name: 'October 2026' }));

    expect(await card.findByText(`$769.90`)).toBeInTheDocument();
    expect(card.getByText('closed month')).toBeInTheDocument();
    expect(card.getByText('$16,040.43')).toBeInTheDocument();
    expect(card.getByText('$7,698.99', { selector: 'dd' })).toBeInTheDocument();
    expect(card.getByText('10.0%', { selector: 'dd' })).toBeInTheDocument();
    expect(card.getByText('−$830.40')).toBeInTheDocument();
    expect(card.getAllByText('vs September').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
    expect(document.title).toBe('Dashboard · Sobra');
  });

  it('régua, gráficos e orçamentos descritos em inglês', async () => {
    renderApp(englishDashboard(), { path: '/?mes=2026-10', signedIn: true });

    const ruler = await screen.findByRole('img', { name: /^Income for October/ });
    expect(ruler).toHaveAccessibleName(expect.stringContaining('769 dollars and 90 cents left'));
    expect(screen.getByText('$769.90 left')).toBeInTheDocument();
    const chart = screen.getByRole('img', { name: 'Income × expenses' });
    expect(chart).toHaveAccessibleDescription(/In October, \$7,698\.99 came in/);
    const card = screen.getByRole('region', { name: 'Income × expenses' });
    await userEvent.setup().click(within(card).getByRole('button', { name: 'Show table' }));
    expect(within(card).getByRole('rowheader', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 budgets went over the limit in October.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month: September 2026' })).toBeVisible();
  });
});

describe('en-US + USD: transações', () => {
  const rows = [
    income(ids.tx1),
    {
      ...expense(ids.tx2, 'Pão de Açúcar', 41_237),
      category: {
        id: ids.mercado,
        name: 'Mercado',
        systemKey: 'groceries',
        color: '#D06A1F',
        icon: 'cart',
      },
    },
    transfer(ids.tx3, 50_000),
  ];
  const routes = (): FakeRoutes => ({
    ...baseRoutes(),
    'GET /me': () => ok(english),
    'GET /transactions': () => ok(page(rows, { total: 45 })),
  });

  it('tabela com valores em dólar, categoria padrão traduzida e paginação', async () => {
    renderApp(routes(), { path: '/transacoes?mes=2026-10', signedIn: true });
    const table = await screen.findByRole('table', { name: /Transactions in the period/ });

    expect(within(table).getByText('+$6,800.00')).toBeInTheDocument();
    expect(within(table).getByText('−$412.37')).toBeInTheDocument();
    expect(within(table).getByText('Groceries')).toBeInTheDocument();
    expect(within(table).getByText('Transfer')).toBeInTheDocument();
    expect(within(table).getByText('Oct 18')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /Amount/ })).toBeInTheDocument();
    expect(screen.getByText('1–20 of 45 transactions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Pão de Açúcar' })).toBeInTheDocument();
  });

  it('o formulário valida com mensagens em inglês e lê o valor no formato en-US', async () => {
    const { requests } = renderApp(
      { ...routes(), 'POST /transactions': () => ok(rows[1]) },
      { path: '/transacoes?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'New transaction' }));
    const dialog = await screen.findByRole('dialog', { name: 'New transaction' });
    await ui.click(within(dialog).getByRole('button', { name: 'Add' }));

    expect(
      await within(dialog).findByText('Enter an amount greater than zero, like 85.90'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a description')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose the category', { selector: 'p' })).toBeInTheDocument();

    await ui.type(within(dialog).getByLabelText('Amount ($)'), '1,234.56');
    await ui.type(within(dialog).getByLabelText('Description'), 'Groceries run');
    await ui.selectOptions(within(dialog).getByLabelText('Category'), ids.mercado);
    await ui.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(
        requests.find((r) => r.method === 'POST' && r.path === '/transactions')?.body,
      ).toMatchObject({
        amount: 123_456,
        description: 'Groceries run',
      }),
    );
  });
});

describe('preferências pela interface', () => {
  it('trocar idioma e moeda chama a API e a tela muda na hora, sem recarregar', async () => {
    const saved: unknown[] = [];
    let current = { ...user, locale: 'pt-BR', currency: 'BRL' };
    const { router } = renderApp(
      {
        ...dashboardRoutes(),
        'GET /me': () => ok(current),
        'PATCH /me/preferences': ({ body }) => {
          saved.push(body);
          current = { ...current, ...(body as object) };
          return ok(current);
        },
      },
      { path: '/?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    expect(await screen.findByText('R$ 769,90')).toBeInTheDocument();

    await ui.click(screen.getByRole('button', { name: /Idioma e moeda/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Preferências' });
    expect(
      within(dialog).getByText(/Trocar muda só a exibição: o Sobra não converte câmbio/),
    ).toBeInTheDocument();
    await ui.selectOptions(within(dialog).getByLabelText('Idioma'), 'en-US');

    expect(await screen.findByRole('dialog', { name: 'Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
    // Language alone keeps the currency: reais in the en-US format.
    expect(screen.getByText(`R$769.90`)).toBeInTheDocument();

    await ui.selectOptions(screen.getByLabelText('Currency'), 'USD');
    expect(await screen.findByText('$769.90')).toBeInTheDocument();
    await waitFor(() => expect(saved).toEqual([{ locale: 'en-US' }, { currency: 'USD' }]));
    expect(router.state.location.search).toBe('?mes=2026-10');
  });

  it('se a API recusa, a preferência volta e o erro aparece', async () => {
    renderApp(
      {
        ...dashboardRoutes(),
        'PATCH /me/preferences': () => ({
          status: 500,
          body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } },
        }),
      },
      { path: '/?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    await screen.findByText('R$ 769,90');
    await ui.click(screen.getByRole('button', { name: /Idioma e moeda/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Preferências' });
    await ui.selectOptions(within(dialog).getByLabelText('Moeda'), 'EUR');

    expect(
      await screen.findByText('Não deu para salvar as preferências: Erro interno'),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 769,90')).toBeInTheDocument();
  });
});
