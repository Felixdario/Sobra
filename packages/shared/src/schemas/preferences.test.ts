import { describe, expect, it } from 'vitest';
import { userPreferencesSchema, userPreferencesUpdateSchema } from './preferences';

describe('userPreferencesSchema', () => {
  it('aceita só os idiomas e moedas suportados', () => {
    expect(userPreferencesSchema.parse({ locale: 'en-US', currency: 'USD' })).toEqual({
      locale: 'en-US',
      currency: 'USD',
    });
    const locale = userPreferencesSchema.safeParse({ locale: 'en', currency: 'USD' });
    expect(locale.error?.issues[0]?.message).toBe('Idioma inválido: use pt-BR ou en-US');
    const currency = userPreferencesSchema.safeParse({ locale: 'pt-BR', currency: 'GBP' });
    expect(currency.error?.issues[0]?.message).toBe('Moeda inválida: use BRL, USD ou EUR');
  });
});

describe('userPreferencesUpdateSchema', () => {
  it('aceita qualquer subconjunto, mas não vazio', () => {
    expect(userPreferencesUpdateSchema.parse({ currency: 'EUR' })).toEqual({ currency: 'EUR' });
    expect(userPreferencesUpdateSchema.parse({ locale: 'en-US' })).toEqual({ locale: 'en-US' });
    const empty = userPreferencesUpdateSchema.safeParse({});
    expect(empty.error?.issues[0]?.message).toBe('Informe ao menos um campo para atualizar');
  });
});
