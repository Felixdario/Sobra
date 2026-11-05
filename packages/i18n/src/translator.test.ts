import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { categoryName, createTranslator, translateError } from './translator';

const pt = createTranslator('pt-BR');
const en = createTranslator('en-US');

describe('createTranslator', () => {
  it('traduz pela chave em cada idioma', () => {
    expect(pt('common.actions.save')).toBe('Salvar');
    expect(en('common.actions.save')).toBe('Save');
    expect(en('accountTypes.credit_card')).toBe('Credit card');
    expect(pt.locale).toBe('pt-BR');
  });

  it('reaproveita o tradutor de cada locale', () => {
    expect(createTranslator('en-US')).toBe(en);
  });

  it('interpola placeholders', () => {
    expect(pt('common.states.failedOffline', { what: 'Não deu para carregar o resumo' })).toBe(
      'Não deu para carregar o resumo: sem conexão com o servidor.',
    );
    expect(en('common.states.failedOffline', { what: "Couldn't load the summary" })).toBe(
      "Couldn't load the summary: no connection to the server.",
    );
  });

  it('plural em pt-BR: 1 transação, 2 transações, milhar com ponto', () => {
    expect(pt('counts.transactions', { count: 1 })).toBe('1 transação');
    expect(pt('counts.transactions', { count: 2 })).toBe('2 transações');
    expect(pt('counts.transactions', { count: 1284 })).toBe('1.284 transações');
    // CLDR puts 1 000 000 in "many" for pt; without a `many` form, `other` is used.
    expect(pt('counts.transactions', { count: 1_000_000 })).toBe('1.000.000 transações');
  });

  it('plural em en-US: 1 transaction, 2 transactions, milhar com vírgula', () => {
    expect(en('counts.transactions', { count: 1 })).toBe('1 transaction');
    expect(en('counts.transactions', { count: 2 })).toBe('2 transactions');
    expect(en('counts.transactions', { count: 1284 })).toBe('1,284 transactions');
    expect(en('counts.categories', { count: 1 })).toBe('1 category');
  });

  it('zero exato usa a forma `zero` quando existe', () => {
    expect(pt('counts.transactions', { count: 0 })).toBe('Nenhuma transação');
    expect(en('counts.accounts', { count: 0 })).toBe('No accounts');
  });

  it('chave inexistente em runtime devolve a própria chave', () => {
    expect(en('nao.existe' as 'common.actions.save')).toBe('nao.existe');
    expect(en.has('errors.NOT_FOUND')).toBe(true);
    expect(en.has('errors.NOPE')).toBe(false);
    expect(en.has('errors')).toBe(false);
  });

  it('tipa chaves e parâmetros a partir do catálogo pt-BR', () => {
    expectTypeOf(pt('nav.dashboard')).toEqualTypeOf<string>();
    expectTypeOf(pt('counts.transactions', { count: 3 })).toEqualTypeOf<string>();
    // @ts-expect-error unknown key
    expect(() => pt('nav.nope')).not.toThrow();
    // @ts-expect-error plural messages require `count`
    expect(() => pt('counts.transactions')).not.toThrow();
    // @ts-expect-error `what` is required
    expect(() => pt('common.states.failedOffline', {})).not.toThrow();
  });

  describe('sem Intl.PluralRules (motor JS antigo)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    it('cai na regra CLDR para inteiros', async () => {
      vi.stubGlobal('Intl', Object.create(Intl, { PluralRules: { value: undefined } }));
      vi.resetModules();
      const { createTranslator: fresh } = await import('./translator');
      expect(fresh('pt-BR')('counts.transactions', { count: 1 })).toBe('1 transação');
      expect(fresh('pt-BR')('counts.transactions', { count: 3 })).toBe('3 transações');
      expect(fresh('en-US')('counts.transactions', { count: 1 })).toBe('1 transaction');
      expect(fresh('en-US')('counts.transactions', { count: 3 })).toBe('3 transactions');
    });
  });
});

describe('translateError', () => {
  it('traduz pelo código, com a mensagem do servidor como reserva', () => {
    const offline = { code: 'NETWORK_ERROR', message: 'Não foi possível conectar…' };
    expect(translateError(en, offline)).toBe(
      "Couldn't reach the server. Check your connection and try again.",
    );
    expect(
      translateError(en, { code: 'CONFLICT', message: 'Este e-mail já está cadastrado' }),
    ).toBe('This conflicts with the current state. Refresh and try again.');
    expect(translateError(en, { code: 'NEW_CODE', message: 'Mensagem nova da API' })).toBe(
      'Mensagem nova da API',
    );
    expect(translateError(en, { code: 'NEW_CODE', message: '' })).toBe('Unexpected error.');
    expect(translateError(pt, new Error('boom'))).toBe('boom');
    expect(translateError(pt, null)).toBe('Erro inesperado.');
  });
});

describe('categoryName', () => {
  it('mostra o nome traduzido enquanto a categoria padrão não foi renomeada', () => {
    const groceries = { name: 'Mercado', systemKey: 'groceries' as const };
    expect(categoryName(en, groceries)).toBe('Groceries');
    expect(categoryName(pt, groceries)).toBe('Mercado');
    expect(categoryName(en, { name: 'Feira', systemKey: null })).toBe('Feira');
    expect(categoryName(en, { name: 'Pets' })).toBe('Pets');
    expect(categoryName(en, { name: 'Outros', systemKey: 'other' })).toBe('Other');
  });
});
