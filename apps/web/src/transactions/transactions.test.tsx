import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, baseRoutes, expense, ids, income, ok, page, transfer } from '../test/fixtures';
import type { FakeReply, FakeRoutes } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

const rows = [
  income(ids.tx1),
  expense(ids.tx2, 'Pão de Açúcar', 41_237),
  transfer(ids.tx3, 50_000),
];

function routes(extra: FakeRoutes = {}): FakeRoutes {
  return {
    ...baseRoutes(),
    'GET /transactions': ({ query }) =>
      ok(
        page(rows, {
          page: Number(query.get('page') ?? 1),
          pageSize: Number(query.get('pageSize') ?? 20),
          total: 45,
        }),
      ),
    ...extra,
  };
}

const lastList = (requests: { method: string; path: string; query: URLSearchParams }[]) =>
  requests.filter((r) => r.method === 'GET' && r.path === '/transactions').at(-1)?.query;

function deferred() {
  let resolve!: (reply: FakeReply) => void;
  const promise = new Promise<FakeReply>((r) => (resolve = r));
  return { promise, resolve };
}

describe('transações: tabela', () => {
  it('mostra valor com sinal, transferência como origem → destino e o total paginado', async () => {
    renderApp(routes(), { path: '/transacoes?mes=2026-10', signedIn: true });

    const table = await screen.findByRole('table', { name: /Transações do período/ });
    expect(within(table).getByText('+R$ 6.800,00')).toBeInTheDocument();
    expect(within(table).getByText('−R$ 412,37')).toBeInTheDocument();
    expect(within(table).getByText('Nubank → Carteira')).toBeInTheDocument();
    expect(screen.getByText('1–20 de 45 transações')).toBeInTheDocument();
  });

  it('ordenar por valor muda a URL e a chamada à API', async () => {
    const { router, requests } = renderApp(routes(), {
      path: '/transacoes?mes=2026-10',
      signedIn: true,
    });
    await screen.findByRole('table');

    await userEvent.setup().click(screen.getByRole('button', { name: /Valor/ }));
    await waitFor(() => expect(router.state.location.search).toContain('ordem=amount%3Adesc'));
    await waitFor(() => expect(lastList(requests)?.get('sort')).toBe('amount:desc'));
    expect(screen.getByRole('columnheader', { name: /Valor/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('filtro por tipo vai para a URL, para a API e volta à página 1', async () => {
    const { router, requests } = renderApp(routes(), {
      path: '/transacoes?mes=2026-10&pagina=2',
      signedIn: true,
    });
    await screen.findByRole('table');

    await userEvent.setup().selectOptions(screen.getByLabelText('Tipo'), 'expense');
    await waitFor(() => expect(router.state.location.search).toBe('?mes=2026-10&tipo=expense'));
    await waitFor(() => expect(lastList(requests)?.get('type')).toBe('expense'));
    expect(lastList(requests)?.get('page')).toBe('1');
  });

  it('a busca espera o usuário parar de digitar antes de chamar a API', async () => {
    const { router, requests } = renderApp(routes(), {
      path: '/transacoes?mes=2026-10',
      signedIn: true,
    });
    await screen.findByRole('table');
    const before = requests.length;

    await userEvent.setup().type(screen.getByLabelText('Buscar na descrição'), 'pão');
    expect(requests.filter((r) => r.query.get('search')).length).toBe(0);
    await waitFor(() => expect(router.state.location.search).toContain('busca=p%C3%A3o'));
    await waitFor(() => expect(lastList(requests)?.get('search')).toBe('pão'));
    expect(requests.length - before).toBe(1);
  });

  it('paginação e tamanho da página são server-side', async () => {
    const { router, requests } = renderApp(routes(), {
      path: '/transacoes?mes=2026-10',
      signedIn: true,
    });
    await screen.findByRole('table');
    const ui = userEvent.setup();

    await ui.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(lastList(requests)?.get('page')).toBe('2'));
    expect(router.state.location.search).toContain('pagina=2');

    await ui.selectOptions(screen.getByLabelText('Por página'), '50');
    await waitFor(() => expect(lastList(requests)?.get('pageSize')).toBe('50'));
    expect(router.state.location.search).toContain('itens=50');
    expect(router.state.location.search).not.toContain('pagina=');
  });

  it('mês sem lançamentos mostra o próximo passo; erro mostra tentar de novo', async () => {
    let fail = true;
    renderApp(
      {
        ...routes(),
        'GET /transactions': ({ query }) =>
          query.get('month') === '2026-08'
            ? ok(page([]))
            : fail
              ? apiError(500, 'INTERNAL', 'Erro interno')
              : ok(page(rows)),
      },
      { path: '/transacoes?mes=2026-10', signedIn: true },
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não deu para carregar as transações.');
    fail = false;
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('estado vazio do mês', async () => {
    renderApp(
      { ...routes(), 'GET /transactions': () => ok(page([])) },
      {
        path: '/transacoes?mes=2026-08',
        signedIn: true,
      },
    );
    expect(await screen.findByText('Nenhum lançamento em agosto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lançar o primeiro gasto' })).toBeInTheDocument();
  });
});

describe('transações: editar e apagar', () => {
  it('editar é otimista: a linha muda antes da API responder', async () => {
    const reply = deferred();
    const { requests } = renderApp(
      routes({ 'PATCH /transactions/0198f1c2-0000-7000-8000-000000000302': () => reply.promise }),
      { path: '/transacoes?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Editar Pão de Açúcar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar transação' });
    expect(within(dialog).getByLabelText('Valor (R$)')).toHaveFocus();
    const description = within(dialog).getByLabelText('Descrição');
    await ui.clear(description);
    await ui.type(description, 'Pão de Açúcar Vila');
    await ui.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Pão de Açúcar Vila')).toBeInTheDocument();
    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toMatchObject({
      description: 'Pão de Açúcar Vila',
      amount: 41_237,
      type: 'expense',
    });
    await act(async () => reply.resolve(ok({ ...expense(ids.tx2, 'Pão de Açúcar Vila', 41_237) })));
    expect(await screen.findByText('Transação atualizada.')).toBeInTheDocument();
  });

  it('se a API recusa a edição, a linha volta ao que era e o erro aparece', async () => {
    renderApp(
      routes({
        'PATCH /transactions/0198f1c2-0000-7000-8000-000000000302': () =>
          apiError(400, 'VALIDATION_ERROR', 'Dados inválidos'),
      }),
      { path: '/transacoes?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Editar Pão de Açúcar' }));
    const dialog = await screen.findByRole('dialog');
    const description = within(dialog).getByLabelText('Descrição');
    await ui.clear(description);
    await ui.type(description, 'Outro nome');
    await ui.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Não deu para salvar: Dados inválidos')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Outro nome')).not.toBeInTheDocument());
    expect(screen.getByText('Pão de Açúcar')).toBeInTheDocument();
  });

  it('apagar some da lista e "Desfazer" recria a mesma transação', async () => {
    let deleted = false;
    const { requests } = renderApp(
      routes({
        'GET /transactions': () => ok(page(deleted ? rows.filter((r) => r.id !== ids.tx2) : rows)),
        'DELETE /transactions/0198f1c2-0000-7000-8000-000000000302': () => {
          deleted = true;
          return { status: 204 };
        },
        'POST /transactions': () =>
          ok(expense(ids.tx1.replace('301', '399'), 'Pão de Açúcar', 41_237)),
      }),
      { path: '/transacoes?mes=2026-10', signedIn: true },
    );
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Apagar Pão de Açúcar' }));

    await waitFor(() => expect(screen.queryByText('Pão de Açúcar')).not.toBeInTheDocument());
    await ui.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(() =>
      expect(requests.some((r) => r.method === 'POST' && r.path === '/transactions')).toBe(true),
    );
    expect(requests.find((r) => r.method === 'POST' && r.path === '/transactions')?.body).toEqual({
      type: 'expense',
      accountId: ids.nubank,
      categoryId: ids.mercado,
      amount: 41_237,
      description: 'Pão de Açúcar',
      date: '2026-10-18',
    });
  });

  it('nova transação valida com as mensagens do shared e do formulário', async () => {
    const { requests } = renderApp(routes(), { path: '/transacoes?mes=2026-10', signedIn: true });
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole('button', { name: 'Nova transação' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova transação' });
    await ui.click(within(dialog).getByRole('button', { name: 'Lançar' }));

    expect(
      await within(dialog).findByText('Informe um valor maior que zero, como 85,90'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Informe a descrição')).toBeInTheDocument();
    expect(within(dialog).getByText('Escolha a categoria', { selector: 'p' })).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST' && r.path === '/transactions')).toBe(false);
  });
});
