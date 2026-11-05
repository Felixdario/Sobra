import { monthKey, transactionSchema } from '@sobra/shared';
import { expense, ids, income, transfer } from '../../test/fixtures';
import { groupByDay, hasFilters, PAGE_SIZE, toParams } from './listModel';

const now = new Date('2026-11-04T15:00:00Z');
const parse = (items: unknown[]) => items.map((item) => transactionSchema.parse(item));

describe('lista agrupada por dia', () => {
  it('um cabeçalho por dia, com Hoje/Ontem e a data por extenso curta', () => {
    const rows = groupByDay(
      parse([
        expense(ids.tx1, ids.mercado, ids.checking, 4_590, '2026-11-04'),
        expense(ids.tx2, ids.transporte, ids.checking, 1_000, '2026-11-03'),
        expense(ids.tx3, ids.lazer, ids.checking, 2_000, '2026-11-02'),
      ]),
      now,
    );
    expect(
      rows.filter((row) => row.kind === 'day').map((row) => row.kind === 'day' && row.label),
    ).toEqual(['Hoje', 'Ontem', 'seg., 2 de nov.']);
    expect(rows.map((row) => row.kind)).toEqual(['day', 'tx', 'day', 'tx', 'day', 'tx']);
  });

  it('o total do dia soma receitas e despesas e ignora transferências', () => {
    const [day] = groupByDay(
      parse([
        expense(ids.tx1, ids.mercado, ids.checking, 4_590, '2026-11-04'),
        income(ids.tx2, ids.salario, ids.checking, 10_000, '2026-11-04'),
        transfer(ids.tx3, ids.checking, ids.wallet, 50_000, '2026-11-04'),
      ]),
      now,
    );
    expect(day).toMatchObject({ kind: 'day', label: 'Hoje', total: 5_410 });
  });
});

describe('filtros', () => {
  it('viram parâmetros da API sem valores vazios', () => {
    expect(toParams({})).toEqual({ pageSize: PAGE_SIZE });
    expect(
      toParams({
        month: monthKey('2026-10'),
        accountId: ids.checking,
        categoryId: undefined,
        search: '  pão ',
      }),
    ).toEqual({ pageSize: PAGE_SIZE, month: '2026-10', accountId: ids.checking, search: 'pão' });
    expect(hasFilters({ search: '   ' })).toBe(false);
    expect(hasFilters({ categoryId: ids.mercado })).toBe(true);
  });
});
