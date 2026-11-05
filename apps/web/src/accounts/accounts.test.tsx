import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { account, accounts, baseRoutes, ids, ok } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

async function openEdit(name: string) {
  const ui = userEvent.setup();
  await ui.click(await screen.findByRole('button', { name: `Editar ${name}` }));
  const dialog = await screen.findByRole('dialog', { name: `Editar ${name}` });
  await ui.click(within(dialog).getByRole('button', { name: 'Excluir ou arquivar' }));
}

describe('contas', () => {
  it('lista os saldos; o cartão negativo é dívida, com sinal e a palavra "fatura"', async () => {
    renderApp(baseRoutes(), { path: '/contas', signedIn: true });

    const card = (await screen.findByText('Cartão Inter')).closest('li')!;
    expect(within(card).getByText('−R$ 2.891,80')).toBeInTheDocument();
    expect(within(card).getByText('fatura em aberto')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.524,98')).toBeInTheDocument();
  });

  it('conta sem lançamentos: a API responde 204 e ela é excluída', async () => {
    renderApp(
      { ...baseRoutes(), [`DELETE /accounts/${ids.carteira}`]: () => ({ status: 204 }) },
      { path: '/contas', signedIn: true },
    );
    await openEdit('Carteira');

    expect(
      await screen.findByText('Conta “Carteira” excluída: não tinha lançamentos.'),
    ).toBeInTheDocument();
  });

  it('conta com lançamentos: a API responde 200 com a conta arquivada', async () => {
    renderApp(
      {
        ...baseRoutes(),
        [`DELETE /accounts/${ids.nubank}`]: () =>
          ok({ ...account(ids.nubank, 'Nubank', 686_313), archived: true }),
      },
      { path: '/contas', signedIn: true },
    );
    await openEdit('Nubank');

    expect(await screen.findByText(/Nubank tem lançamentos e foi arquivada/)).toBeInTheDocument();
  });

  it('cria conta com tipo, saldo inicial negativo, cor e ícone escolhidos', async () => {
    const { requests } = renderApp(
      { ...baseRoutes(), 'POST /accounts': () => ok(account(ids.nubank, 'Cartão XP', -50_000)) },
      { path: '/contas', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Nova conta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta' });
    await ui.type(within(dialog).getByLabelText('Nome'), 'Cartão XP');
    await ui.selectOptions(within(dialog).getByLabelText('Tipo'), 'credit_card');
    await ui.type(within(dialog).getByLabelText('Saldo inicial (R$)'), '-500,00');
    await ui.click(within(dialog).getByRole('radio', { name: 'Petróleo' }));
    await ui.click(within(dialog).getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Conta “Cartão XP” criada.')).toBeInTheDocument();
    expect(requests.find((r) => r.method === 'POST' && r.path === '/accounts')?.body).toEqual({
      name: 'Cartão XP',
      type: 'credit_card',
      initialBalance: -50_000,
      color: '#1F7A80',
      icon: 'credit-card',
    });
    expect(accounts).toHaveLength(3);
  });
});
