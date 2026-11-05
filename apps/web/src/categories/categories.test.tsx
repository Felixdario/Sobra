import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, baseRoutes, category, ids, ok } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

describe('categorias', () => {
  it('separa receitas e despesas', async () => {
    renderApp(baseRoutes(), { path: '/categorias', signedIn: true });

    const expenses = await screen.findByRole('region', { name: 'Despesas' });
    const incomes = screen.getByRole('region', { name: 'Receitas' });
    expect(await within(expenses).findByText('Mercado')).toBeInTheDocument();
    expect(within(incomes).getByText('Salário')).toBeInTheDocument();
    expect(within(incomes).queryByText('Mercado')).not.toBeInTheDocument();
  });

  it('categoria em uso: o 409 da API aparece no painel, que fica aberto', async () => {
    const message =
      'Esta categoria está em uso por transações, orçamentos ou recorrências e não pode ser excluída';
    renderApp(
      {
        ...baseRoutes(),
        [`DELETE /categories/${ids.mercado}`]: () => apiError(409, 'CONFLICT', message),
      },
      { path: '/categorias', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Editar Mercado' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar Mercado' });
    await ui.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message);
    expect(dialog).toHaveAttribute('open');
  });

  it('cria categoria de receita com cor da paleta e ícone escolhido', async () => {
    const { requests } = renderApp(
      { ...baseRoutes(), 'POST /categories': () => ok(category(ids.lazer, 'Bônus', 'income')) },
      { path: '/categorias', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Nova categoria de receita' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria de receita' });
    await ui.type(within(dialog).getByLabelText('Nome'), 'Bônus');
    await ui.click(within(dialog).getByRole('radio', { name: 'Verde' }));
    await ui.click(within(dialog).getByRole('radio', { name: 'Presente' }));
    await ui.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    expect(await screen.findByText('Categoria Bônus criada.')).toBeInTheDocument();
    expect(requests.find((r) => r.method === 'POST' && r.path === '/categories')?.body).toEqual({
      name: 'Bônus',
      kind: 'income',
      color: '#2E8B57',
      icon: 'gift',
    });
  });
});
