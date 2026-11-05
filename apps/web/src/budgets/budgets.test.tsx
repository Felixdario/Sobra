import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { baseRoutes, ids, ok } from '../test/fixtures';
import type { FakeRoutes } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

const mercado = {
  id: ids.budgetMercado,
  categoryId: ids.mercado,
  month: '2026-10',
  amount: 120_000,
  spent: 114_806,
  remaining: 5_194,
};

const routes = (extra: FakeRoutes = {}): FakeRoutes => ({
  ...baseRoutes(),
  'GET /budgets': () => ok([mercado]),
  ...extra,
});

describe('orçamentos', () => {
  it('mostra a barra do DESIGN com o estado e as categorias sem orçamento', async () => {
    renderApp(routes(), { path: '/orcamentos?mes=2026-10', signedIn: true });

    const bar = await screen.findByRole('progressbar', { name: 'Mercado' });
    expect(bar).toHaveAttribute('aria-valuetext', expect.stringContaining('96% do orçamento'));
    expect(screen.getByText(/Perto do limite/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Definir orçamento de Lazer' })).toBeInTheDocument();
  });

  it('define o valor no lugar, com parseBRL, e recusa valor inválido', async () => {
    const { requests } = renderApp(
      routes({
        'PUT /budgets': ({ body }) =>
          ok({ ...mercado, ...(body as object), id: ids.batch, spent: 0, remaining: 0 }),
      }),
      { path: '/orcamentos?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Definir orçamento de Lazer' }));
    const input = screen.getByLabelText('Orçamento de Lazer em outubro');
    expect(input).toHaveFocus();

    await ui.type(input, 'abc{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um valor maior que zero');

    await ui.clear(input);
    await ui.type(input, '1.250,50{Enter}');
    await waitFor(() =>
      expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({
        categoryId: ids.lazer,
        month: '2026-10',
        amount: 125_050,
      }),
    );
    expect(await screen.findByText('Orçamento de Lazer: R$ 1.250,50.')).toBeInTheDocument();
  });

  it('Esc cancela a edição sem chamar a API', async () => {
    const { requests } = renderApp(routes(), { path: '/orcamentos?mes=2026-10', signedIn: true });
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Editar orçamento de Mercado' }));
    await ui.keyboard('{Escape}');

    expect(screen.queryByLabelText('Orçamento de Mercado em outubro')).not.toBeInTheDocument();
    expect(requests.some((r) => r.method === 'PUT')).toBe(false);
  });

  it('copia os orçamentos do mês anterior', async () => {
    const { requests } = renderApp(
      routes({
        'POST /budgets/copy': () =>
          ok([mercado, { ...mercado, id: ids.batch, categoryId: ids.lazer, amount: 30_000 }]),
      }),
      { path: '/orcamentos?mes=2026-10', signedIn: true },
    );
    await screen.findByRole('progressbar', { name: 'Mercado' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Copiar de setembro' }));

    expect(await screen.findByText('1 orçamento copiado de setembro.')).toBeInTheDocument();
    expect(requests.find((r) => r.path === '/budgets/copy')?.body).toEqual({
      from: '2026-09',
      to: '2026-10',
    });
  });

  it('remove um orçamento', async () => {
    const { requests } = renderApp(
      routes({ [`DELETE /budgets/${ids.budgetMercado}`]: () => ({ status: 204 }) }),
      { path: '/orcamentos?mes=2026-10', signedIn: true },
    );
    const item = (await screen.findByRole('progressbar', { name: 'Mercado' })).closest('li')!;
    await userEvent
      .setup()
      .click(within(item).getByRole('button', { name: 'Remover orçamento de Mercado' }));

    expect(await screen.findByText('Orçamento de Mercado removido.')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'DELETE' && r.path.startsWith('/budgets/'))).toBe(
      true,
    );
  });
});
