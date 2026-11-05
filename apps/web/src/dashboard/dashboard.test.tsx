import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { dashboardRoutes, emptyMonth } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

const summaryCard = async (title: string) =>
  screen.findByRole('region', { name: title }).then((region) => within(region));

describe('painel', () => {
  it('mostra a sobra, os KPIs e as variações de outubro a partir da API', async () => {
    renderApp(dashboardRoutes(), { path: '/?mes=2026-10', signedIn: true });
    const card = await summaryCard('Outubro de 2026');

    expect(await card.findByText('R$ 769,90')).toBeInTheDocument();
    expect(card.getByText('mês fechado')).toBeInTheDocument();
    expect(card.getByText('R$ 16.040,43')).toBeInTheDocument();
    expect(card.getByText('R$ 7.698,99', { selector: 'dd' })).toBeInTheDocument();
    expect(card.getByText('R$ 6.929,09', { selector: 'dd' })).toBeInTheDocument();
    expect(card.getByText('10,0%', { selector: 'dd' })).toBeInTheDocument();
    // Variation: sign (U+2212) and named base, never color alone.
    expect(card.getByText('−R$ 830,40')).toBeInTheDocument();
    expect(card.getByText('+R$ 769,90')).toBeInTheDocument();
    expect(card.getAllByText('vs setembro').length).toBeGreaterThan(0);
  });

  it('a régua do mês descreve receitas, despesas e a sobra', async () => {
    renderApp(dashboardRoutes(), { path: '/?mes=2026-10', signedIn: true });

    const ruler = await screen.findByRole('img', { name: /^Receitas de outubro/ });
    expect(ruler).toHaveAccessibleName(expect.stringContaining('sobra de 769 reais e 90 centavos'));
    expect(screen.getByText('Sobra R$ 769,90')).toBeInTheDocument();
  });

  it('no mês corrente parcial, não mostra a taxa de −325% como manchete', async () => {
    renderApp(dashboardRoutes(), { path: '/', signedIn: true });
    const card = await summaryCard('Novembro de 2026');

    expect(await card.findByText('parcial · dia 4 de 30')).toBeInTheDocument();
    expect(card.getByText('Em aberto')).toBeInTheDocument();
    expect(card.getByText(/Até agora:/)).toHaveTextContent(
      'Até agora: R$ 61,89 recebidos, R$ 263,16 gastos · parcial, dia 4 de 30',
    );
    expect(screen.queryByText(/325/)).not.toBeInTheDocument();
  });

  it('mês sem lançamentos mostra o estado vazio com o próximo passo', async () => {
    renderApp(dashboardRoutes({ '2026-08': emptyMonth('2026-08', '2026-07') }), {
      path: '/?mes=2026-08',
      signedIn: true,
    });
    const card = await summaryCard('Agosto de 2026');

    expect(await card.findByText('Nenhum lançamento em agosto.')).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Lance o primeiro gasto' })).toHaveAttribute(
      'href',
      '/transacoes',
    );
  });

  it('erro ao carregar o resumo mostra o que falhou e tenta de novo', async () => {
    let fail = true;
    const routes = dashboardRoutes();
    const original = routes['GET /summary/month'];
    routes['GET /summary/month'] = (request) =>
      fail
        ? { status: 500, body: { error: { code: 'INTERNAL', message: 'Erro interno' } } }
        : original!(request);
    renderApp(routes, { path: '/?mes=2026-10', signedIn: true });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não deu para carregar o resumo do mês.');
    fail = false;
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('R$ 769,90')).toBeInTheDocument();
  });

  it('sem rede, o erro diz que não há conexão', async () => {
    const routes = dashboardRoutes();
    routes['GET /summary/month'] = () => {
      throw new TypeError('Failed to fetch');
    };
    renderApp(routes, { path: '/?mes=2026-10', signedIn: true });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não deu para carregar o resumo do mês: sem conexão com o servidor.',
    );
  });

  it('orçamento estourado é dito com valor, ícone e a palavra "acima"', async () => {
    renderApp(dashboardRoutes(), { path: '/?mes=2026-10', signedIn: true });

    const bar = await screen.findByRole('progressbar', { name: 'Lazer' });
    expect(bar).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('1601 reais e 53 centavos'),
    );
    expect(screen.getByText('R$ 1.301,53')).toBeInTheDocument();
    expect(
      screen.getByText('1 de 2 orçamentos passaram do limite em outubro.'),
    ).toBeInTheDocument();
  });

  it('os gráficos têm descrição e tabela equivalente', async () => {
    renderApp(dashboardRoutes(), { path: '/?mes=2026-10', signedIn: true });

    const chart = await screen.findByRole('img', { name: 'Receitas × despesas' });
    expect(chart).toHaveAccessibleDescription(/Em outubro entraram R\$\s7\.698,99/);
    const card = screen.getByRole('region', { name: 'Receitas × despesas' });
    await userEvent.setup().click(within(card).getByRole('button', { name: 'Ver tabela' }));
    const table = within(card).getByRole('table');
    expect(within(table).getByRole('rowheader', { name: 'Outubro de 2026' })).toBeInTheDocument();
  });

  it('o seletor de mês navega para o mês anterior e não passa do mês atual', async () => {
    const { router } = renderApp(dashboardRoutes(), { path: '/', signedIn: true });
    const ui = userEvent.setup();

    const next = await screen.findByRole('button', { name: /Próximo mês/ });
    expect(next).toBeDisabled();
    await ui.click(screen.getByRole('button', { name: 'Mês anterior: Outubro de 2026' }));
    await waitFor(() => expect(router.state.location.search).toBe('?mes=2026-10'));
    expect(await screen.findByText('mês fechado')).toBeInTheDocument();
  });
});
