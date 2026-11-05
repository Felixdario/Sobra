import { monthKey } from '@sobra/shared';
import { describe, expect, it } from 'vitest';
import { nextSort, readListState, toApiParams, writeListState } from './listState';

const NOW = new Date('2026-11-04T12:00:00-03:00');

describe('estado da lista na URL', () => {
  it('lê e escreve os filtros em português, sem os valores padrão', () => {
    const state = readListState(
      new URLSearchParams('mes=2026-10&tipo=expense&busca=uber&ordem=amount:asc&pagina=3&itens=50'),
      NOW,
    );
    expect(toApiParams(state)).toEqual({
      month: '2026-10',
      accountId: undefined,
      categoryId: undefined,
      type: 'expense',
      search: 'uber',
      sort: 'amount:asc',
      page: 3,
      pageSize: 50,
    });
    expect(
      writeListState(
        { ...state, month: monthKey('2026-11'), page: 1, pageSize: 20 },
        NOW,
      ).toString(),
    ).toBe('tipo=expense&busca=uber&ordem=amount%3Aasc');
  });

  it('valores inválidos na URL caem no padrão', () => {
    const state = readListState(new URLSearchParams('mes=2026-13&tipo=x&ordem=foo&itens=7'), NOW);
    expect(state).toMatchObject({ month: '2026-11', type: undefined, pageSize: 20 });
    expect(state.sort).toEqual({ field: 'date', direction: 'desc' });
  });

  it('clicar na mesma coluna inverte; outra coluna começa no sentido esperado', () => {
    expect(nextSort({ field: 'date', direction: 'desc' }, 'date')).toEqual({
      field: 'date',
      direction: 'asc',
    });
    expect(nextSort({ field: 'date', direction: 'desc' }, 'description')).toEqual({
      field: 'description',
      direction: 'asc',
    });
    expect(nextSort({ field: 'date', direction: 'asc' }, 'amount')).toEqual({
      field: 'amount',
      direction: 'desc',
    });
  });
});
