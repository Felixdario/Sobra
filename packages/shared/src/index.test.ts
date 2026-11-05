import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  APP_NAME,
  CURRENCY,
  LOCALE,
  TIME_ZONE,
  cents,
  centsSchema,
  formatBRL,
  formatMoney,
  resolveLocale,
  healthResponseSchema,
  monthKeySchema,
  toMonthKey,
  transactionCreateSchema,
  type Cents,
  type MonthKey,
} from './index';

describe('@sobra/shared', () => {
  it('expõe o nome do app e a localização', () => {
    expect(APP_NAME).toBe('Sobra');
    expect([LOCALE, CURRENCY, TIME_ZONE]).toEqual(['pt-BR', 'BRL', 'America/Sao_Paulo']);
  });

  it('reexporta os utilitários de dinheiro e datas', () => {
    expect(formatBRL(cents(123_456))).toBe('R$\u00a01.234,56');
    expect(formatMoney(cents(-100), { locale: 'en-US', currency: 'USD' })).toBe('−$1.00');
    expect(toMonthKey(new Date('2026-12-01T02:30:00Z'))).toBe('2026-11');
  });

  it('resolve o idioma do aparelho para um locale suportado', () => {
    expect(resolveLocale('en-GB')).toBe('en-US');
    expect(resolveLocale('pt-PT')).toBe('pt-BR');
    expect(resolveLocale('en_us')).toBe('en-US');
    expect(resolveLocale(['fr-FR', 'en-AU'])).toBe('en-US');
    expect(resolveLocale(['fr-FR', null])).toBe('pt-BR');
    expect(resolveLocale(undefined)).toBe('pt-BR');
  });

  it('valida a resposta de saúde', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(healthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });

  it('reexporta os schemas com os tipos de money e date', () => {
    expect(transactionCreateSchema).toBeDefined();
    expectTypeOf(centsSchema.parse(100)).toEqualTypeOf<Cents>();
    expectTypeOf(monthKeySchema.parse('2026-11')).toEqualTypeOf<MonthKey>();
    expectTypeOf(toMonthKey).returns.toEqualTypeOf<MonthKey>();
  });
});
