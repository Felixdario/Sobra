import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accountSchema, categorySchema, csvImportPreviewSchema } from '@financas/shared';
import type { App } from '../../app';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';
import { mapCsvRow, parseCsvText } from './csv';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const fixture = readFileSync(
  new URL('../../../fixtures/extrato-exemplo.csv', import.meta.url),
  'utf8',
);

describe('parseCsvText', () => {
  it('lê o extrato de exemplo: separador ;, cabeçalho e coluna de saldo ignorada', () => {
    const rows = parseCsvText(fixture);
    expect(rows).toHaveLength(20);
    expect(rows[1]).toEqual({
      rowNumber: 3,
      raw: {
        date: '01/10/2026',
        description: 'PIX RECEBIDO - SALARIO ACME LTDA',
        amount: '6.800,00',
      },
    });
  });

  it('aceita vírgula como separador, datas ISO, aspas e arquivo sem cabeçalho', () => {
    const rows = parseCsvText('﻿2026-11-04,"PADARIA, CENTRO","-12,50"\r\n2026-11-05,PIX,-3.50\r\n');
    expect(rows.map((row) => row.raw)).toEqual([
      { date: '2026-11-04', description: 'PADARIA, CENTRO', amount: '-12,50' },
      { date: '2026-11-05', description: 'PIX', amount: '-3.50' },
    ]);
    expect(rows.map((row) => mapCsvRow(row.raw).mapped)).toEqual([
      { date: '2026-11-04', description: 'PADARIA, CENTRO', type: 'expense', amount: 1250 },
      { date: '2026-11-05', description: 'PIX', type: 'expense', amount: 350 },
    ]);
  });

  it('descobre as colunas pela posição quando não há cabeçalho', () => {
    const rows = parseCsvText('MERCADO X;-10,00;04/11/2026\nLOJA Y;20,00;05/11/2026');
    expect(rows[0]?.raw).toEqual({
      date: '04/11/2026',
      description: 'MERCADO X',
      amount: '-10,00',
    });
  });

  it('rejeita arquivo vazio ou só com cabeçalho', () => {
    expect(() => parseCsvText('\n\n')).toThrow('O arquivo não tem linhas para importar');
    expect(() => parseCsvText('Data;Descrição;Valor\n')).toThrow(
      'O arquivo não tem linhas para importar',
    );
  });
});

describe('mapCsvRow', () => {
  it.each([
    [{ date: '31/02/2026', description: 'x', amount: '1,00' }, 'Data inválida'],
    [{ date: '01/02/2026', description: 'x', amount: '1.5.0' }, 'Valor inválido'],
    [{ date: '01/02/2026', description: 'x', amount: '0,00' }, 'Valor zero'],
    [{ date: '01/02/2026', description: '', amount: '1,00' }, 'Coluna descrição vazia'],
  ])('marca erro em %o', (raw, message) => {
    expect(mapCsvRow(raw).error).toContain(message);
  });

  it('valor positivo vira receita, negativo despesa, e corta a descrição em 120', () => {
    expect(
      mapCsvRow({ date: '01/02/2026', description: 'A'.repeat(200), amount: 'R$ 1.234,56' }).mapped,
    ).toEqual({ date: '2026-02-01', description: 'A'.repeat(120), type: 'income', amount: 123456 });
  });
});

describe('/imports', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup() {
    const user: TestUser = await registerUser(app);
    const api = (method: Method, url: string, payload?: object) =>
      app.inject({ method, url, headers: authHeader(user), ...(payload && { payload }) });
    const categories = categorySchema.array().parse((await api('GET', '/categories')).json());
    const category = (name: string) => categories.find((c) => c.name === name)?.id ?? '';
    const account = accountSchema.parse(
      (
        await api('POST', '/accounts', {
          name: 'Banco',
          type: 'checking',
          color: '#112233',
          icon: 'landmark',
        })
      ).json(),
    );
    const preview = async (payload: object) => {
      const response = await api('POST', '/imports/csv/preview', {
        accountId: account.id,
        ...payload,
      });
      expect(response.statusCode, response.body).toBe(200);
      return csvImportPreviewSchema.parse(response.json());
    };
    return { user, api, category, account, preview };
  }

  it('preview do extrato: valida linhas e sugere categorias', async () => {
    const { category, preview } = await setup();
    const result = await preview({ csv: fixture, fileName: 'extrato-exemplo.csv' });

    expect(result).toMatchObject({ validCount: 19, invalidCount: 1, duplicateCount: 0 });
    const byDescription = new Map(result.rows.map((row) => [row.raw.description, row]));
    expect(byDescription.get('SALDO ANTERIOR')).toMatchObject({
      rowNumber: 2,
      mapped: null,
      error: 'Valor zero não pode ser importado',
    });

    const suggestion = (description: string) =>
      byDescription.get(description)?.suggestedCategoryId ?? null;
    expect(suggestion('SUPERMERCADO BOM PRECO')).toBe(category('Mercado'));
    expect(suggestion('ATACADAO SAO PAULO')).toBe(category('Mercado'));
    expect(suggestion('UBER *TRIP')).toBe(category('Transporte'));
    expect(suggestion('99APP *CORRIDA')).toBe(category('Transporte'));
    expect(suggestion('NETFLIX.COM')).toBe(category('Assinaturas'));
    expect(suggestion('SPOTIFY BRASIL')).toBe(category('Assinaturas'));
    expect(suggestion('MERCADO LIVRE *COMPRA')).toBe(category('Compras'));
    expect(suggestion('PIX RECEBIDO - SALARIO ACME LTDA')).toBe(category('Salário'));
    expect(suggestion('RENDIMENTO POUPANCA')).toBe(category('Rendimentos'));
    expect(suggestion('TARIFA PACOTE SERVICOS')).toBeNull();

    expect(byDescription.get('PAGTO ALUGUEL OUTUBRO')?.mapped).toEqual({
      date: '2026-10-02',
      description: 'PAGTO ALUGUEL OUTUBRO',
      type: 'expense',
      amount: 210_000,
    });
  });

  it('preview também aceita linhas já separadas (rows)', async () => {
    const { preview } = await setup();
    const result = await preview({
      rows: [{ date: '04/11/2026', description: 'Padaria', amount: '-8,00' }],
    });
    expect(result.rows[0]).toMatchObject({ rowNumber: 1, mapped: { amount: 800 } });
  });

  it('commit cria o lote e as transações; o preview seguinte marca duplicatas', async () => {
    const { api, category, account, preview } = await setup();
    const rows = [
      {
        date: '2026-10-03',
        description: 'Supermercado Bom Preço',
        type: 'expense',
        amount: 38_745,
      },
      { date: '2026-10-01', description: 'Salário', type: 'income', amount: 680_000 },
    ].map((row) => ({
      ...row,
      categoryId: category(row.type === 'income' ? 'Salário' : 'Mercado'),
    }));

    const commit = await api('POST', '/imports/csv/commit', {
      accountId: account.id,
      fileName: 'outubro.csv',
      rows,
    });
    expect(commit.statusCode, commit.body).toBe(201);
    const result = commit.json() as { imported: number; skipped: number; batchId: string };
    expect(result).toMatchObject({ imported: 2, skipped: 0 });

    const batch = await app.prisma.importBatch.findUniqueOrThrow({
      where: { id: result.batchId },
      include: { transactions: true },
    });
    expect(batch).toMatchObject({ fileName: 'outubro.csv', rowCount: 2, importedCount: 2 });
    expect(batch.transactions).toHaveLength(2);

    const balance = accountSchema.parse((await api('GET', `/accounts/${account.id}`)).json());
    expect(balance.balance).toBe(680_000 - 38_745);

    const again = await preview({
      csv: 'Data;Descrição;Valor\n03/10/2026;SUPERMERCADO  BOM PRECO;-387,45\n03/10/2026;SUPERMERCADO BOM PRECO;-387,45\n04/10/2026;Outra;-1,00',
    });
    expect(again.rows.map((row) => row.duplicate)).toEqual([true, false, false]);
    expect(again.duplicateCount).toBe(1);

    const skipped = await api('POST', '/imports/csv/commit', { accountId: account.id, rows });
    expect(skipped.json()).toMatchObject({ imported: 0, skipped: 2 });

    const forced = await api('POST', '/imports/csv/commit', {
      accountId: account.id,
      rows,
      force: true,
    });
    expect(forced.json()).toMatchObject({ imported: 2, skipped: 0 });
  });

  it('commit é tudo ou nada: categoria de tipo errado não grava nada', async () => {
    const { api, category, account } = await setup();
    const response = await api('POST', '/imports/csv/commit', {
      accountId: account.id,
      rows: [
        {
          date: '2026-10-01',
          description: 'ok',
          type: 'expense',
          amount: 100,
          categoryId: category('Mercado'),
        },
        {
          date: '2026-10-02',
          description: 'errada',
          type: 'income',
          amount: 100,
          categoryId: category('Mercado'),
        },
      ],
    });
    expect(response.statusCode).toBe(400);
    expect(errorOf(response).message).toBe('Uma receita só pode usar categoria de receita');
    expect(await app.prisma.transaction.count({ where: { accountId: account.id } })).toBe(0);
    expect(await app.prisma.importBatch.count({ where: { accountId: account.id } })).toBe(0);
  });

  it('lista, detalha e desfaz uma importação', async () => {
    const { api, category, account } = await setup();
    const commit = await api('POST', '/imports/csv/commit', {
      accountId: account.id,
      rows: [
        {
          date: '2026-10-01',
          description: 'x',
          type: 'expense',
          amount: 100,
          categoryId: category('Outros'),
        },
      ],
    });
    const { batchId } = commit.json() as { batchId: string };

    const list = await api('GET', '/imports');
    expect(list.json()).toEqual([expect.objectContaining({ id: batchId, importedCount: 1 })]);
    expect((await api('GET', `/imports/${batchId}`)).json()).toMatchObject({ id: batchId });

    expect((await api('DELETE', `/imports/${batchId}`)).statusCode).toBe(204);
    expect((await api('GET', `/imports/${batchId}`)).statusCode).toBe(404);
    expect(await app.prisma.transaction.count({ where: { importBatchId: batchId } })).toBe(0);
    expect(await app.prisma.transaction.count({ where: { accountId: account.id } })).toBe(0);
  });

  it('recusa conta arquivada e CSV sem linhas', async () => {
    const { api, account } = await setup();
    const empty = await api('POST', '/imports/csv/preview', {
      accountId: account.id,
      csv: 'Data;Descrição;Valor',
    });
    expect(empty.statusCode).toBe(400);

    await api('PATCH', `/accounts/${account.id}`, { archived: true });
    const archived = await api('POST', '/imports/csv/preview', {
      accountId: account.id,
      csv: fixture,
    });
    expect(archived.statusCode).toBe(400);
  });

  describe('isolamento', () => {
    it('B não lê nem desfaz importação de A e não importa na conta de A', async () => {
      const alice = await setup();
      const bob = await setup();
      const commit = await alice.api('POST', '/imports/csv/commit', {
        accountId: alice.account.id,
        rows: [
          {
            date: '2026-10-01',
            description: 'x',
            type: 'expense',
            amount: 100,
            categoryId: alice.category('Outros'),
          },
        ],
      });
      const { batchId } = commit.json() as { batchId: string };

      for (const method of ['GET', 'DELETE'] as const) {
        const response = await bob.api(method, `/imports/${batchId}`);
        expect(response.statusCode).toBe(404);
        expect(errorOf(response).message).toBe('Importação não encontrada');
      }
      expect((await bob.api('GET', '/imports')).json()).toEqual([]);

      const preview = await bob.api('POST', '/imports/csv/preview', {
        accountId: alice.account.id,
        csv: fixture,
      });
      expect(preview.statusCode).toBe(404);

      const intoAlice = await bob.api('POST', '/imports/csv/commit', {
        accountId: alice.account.id,
        rows: [
          {
            date: '2026-10-01',
            description: 'x',
            type: 'expense',
            amount: 100,
            categoryId: bob.category('Outros'),
          },
        ],
      });
      expect(intoAlice.statusCode).toBe(404);

      const aliceCategory = await bob.api('POST', '/imports/csv/commit', {
        accountId: bob.account.id,
        rows: [
          {
            date: '2026-10-01',
            description: 'x',
            type: 'expense',
            amount: 100,
            categoryId: alice.category('Outros'),
          },
        ],
      });
      expect(aliceCategory.statusCode).toBe(404);
      expect(errorOf(aliceCategory).message).toBe('Categoria não encontrada');

      expect((await alice.api('GET', `/imports/${batchId}`)).statusCode).toBe(200);
    });
  });
});
