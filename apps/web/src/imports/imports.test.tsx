import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { baseRoutes, ids, ok } from '../test/fixtures';
import type { FakeRoutes } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

const CSV =
  'Data;Lançamento;Valor\n01/10/2026;SALDO ANTERIOR;0,00\n03/10/2026;SUPERMERCADO BOM PRECO;-387,45\n04/10/2026;UBER *TRIP;-23,90\n15/10/2026;SALARIO;6.800,00\n';

const preview = {
  accountId: ids.nubank,
  validCount: 3,
  invalidCount: 1,
  duplicateCount: 1,
  rows: [
    {
      rowNumber: 2,
      raw: { date: '01/10/2026', description: 'SALDO ANTERIOR', amount: '0,00' },
      mapped: null,
      error: 'Valor zero não pode ser importado',
      suggestedCategoryId: null,
      duplicate: false,
    },
    {
      rowNumber: 3,
      raw: { date: '03/10/2026', description: 'SUPERMERCADO BOM PRECO', amount: '-387,45' },
      mapped: {
        date: '2026-10-03',
        description: 'SUPERMERCADO BOM PRECO',
        type: 'expense',
        amount: 38_745,
      },
      error: null,
      suggestedCategoryId: ids.mercado,
      duplicate: false,
    },
    {
      rowNumber: 4,
      raw: { date: '04/10/2026', description: 'UBER *TRIP', amount: '-23,90' },
      mapped: { date: '2026-10-04', description: 'UBER *TRIP', type: 'expense', amount: 2_390 },
      error: null,
      suggestedCategoryId: null,
      duplicate: true,
    },
    {
      rowNumber: 5,
      raw: { date: '15/10/2026', description: 'SALARIO', amount: '6.800,00' },
      mapped: { date: '2026-10-15', description: 'SALARIO', type: 'income', amount: 680_000 },
      error: null,
      suggestedCategoryId: ids.salario,
      duplicate: false,
    },
  ],
};

const batch = {
  id: ids.batch,
  accountId: ids.nubank,
  fileName: 'extrato-exemplo.csv',
  rowCount: 4,
  importedCount: 2,
  skippedCount: 0,
  createdAt: '2026-11-04T12:00:00.000Z',
};

const routes = (extra: FakeRoutes = {}): FakeRoutes => ({
  ...baseRoutes(),
  'GET /imports': () => ok([]),
  'POST /imports/csv/preview': () => ok(preview),
  'POST /imports/csv/commit': () => ok({ batchId: ids.batch, imported: 2, skipped: 0 }),
  ...extra,
});

async function uploadAndPreview() {
  const ui = userEvent.setup();
  const file = new File([CSV], 'extrato-exemplo.csv', { type: 'text/csv' });
  await ui.upload(await screen.findByLabelText('Arquivo CSV'), file);
  await screen.findByText('extrato-exemplo.csv');
  await ui.click(screen.getByRole('button', { name: 'Ver prévia' }));
  await screen.findByRole('region', { name: '2. Prévia' });
  return ui;
}

describe('importar CSV', () => {
  it('prévia: erro e duplicata marcados; só as linhas válidas e novas vêm marcadas', async () => {
    const { requests } = renderApp(routes(), { path: '/importar', signedIn: true });
    await uploadAndPreview();

    expect(requests.find((r) => r.path === '/imports/csv/preview')?.body).toEqual({
      accountId: ids.nubank,
      csv: CSV,
      fileName: 'extrato-exemplo.csv',
    });
    expect(screen.getByText('Valor zero não pode ser importado')).toBeInTheDocument();
    expect(screen.getByText('Já existe na conta')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Importar SALDO ANTERIOR' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Importar UBER *TRIP' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Importar SALARIO' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Importar 2 lançamentos' })).toBeInTheDocument();
  });

  it('confirma com a categoria escolhida por linha e avisa com o resumo', async () => {
    const { requests } = renderApp(routes(), { path: '/importar', signedIn: true });
    const ui = await uploadAndPreview();
    await ui.selectOptions(screen.getByLabelText('Categoria de SUPERMERCADO BOM PRECO'), ids.lazer);
    await ui.click(screen.getByRole('button', { name: 'Importar 2 lançamentos' }));

    expect(await screen.findByText('2 lançamentos importados.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver transações' })).toBeInTheDocument();
    expect(requests.find((r) => r.path === '/imports/csv/commit')?.body).toEqual({
      accountId: ids.nubank,
      force: false,
      fileName: 'extrato-exemplo.csv',
      rows: [
        {
          date: '2026-10-03',
          description: 'SUPERMERCADO BOM PRECO',
          type: 'expense',
          amount: 38_745,
          categoryId: ids.lazer,
        },
        {
          date: '2026-10-15',
          description: 'SALARIO',
          type: 'income',
          amount: 680_000,
          categoryId: ids.salario,
        },
      ],
    });
  });

  it('incluir uma duplicata manda force: true', async () => {
    const { requests } = renderApp(routes(), { path: '/importar', signedIn: true });
    const ui = await uploadAndPreview();
    await ui.click(screen.getByRole('checkbox', { name: 'Importar UBER *TRIP' }));
    await ui.click(screen.getByRole('button', { name: 'Importar 3 lançamentos' }));

    await waitFor(() =>
      expect(requests.find((r) => r.path === '/imports/csv/commit')?.body).toMatchObject({
        force: true,
      }),
    );
  });

  it('desfaz uma importação pela lista', async () => {
    const { requests } = renderApp(
      routes({
        'GET /imports': () => ok([batch]),
        [`DELETE /imports/${ids.batch}`]: () => ({ status: 204 }),
      }),
      { path: '/importar', signedIn: true },
    );
    const history = await screen.findByRole('region', { name: 'Importações anteriores' });
    await userEvent.setup().click(await within(history).findByRole('button', { name: 'Desfazer' }));

    expect(
      await screen.findByText(
        'Importação desfeita: 2 lançamentos de extrato-exemplo.csv removidos.',
      ),
    ).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'DELETE' && r.path === `/imports/${ids.batch}`)).toBe(
      true,
    );
  });
});
