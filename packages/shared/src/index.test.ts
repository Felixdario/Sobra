import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  APP_NAME,
  CURRENCY,
  LOCALE,
  TIME_ZONE,
  cents,
  centsSchema,
  formatBRL,
  healthResponseSchema,
  monthKeySchema,
  toMonthKey,
  transactionCreateSchema,
  type Cents,
  type MonthKey,
} from './index';

describe('@financas/shared', () => {
  it('expõe o nome do app e a localização', () => {
    expect(APP_NAME).toBe('Finanças');
    expect([LOCALE, CURRENCY, TIME_ZONE]).toEqual(['pt-BR', 'BRL', 'America/Sao_Paulo']);
  });

  it('reexporta os utilitários de dinheiro e datas', () => {
    expect(formatBRL(cents(123_456))).toBe('R$\u00a01.234,56');
    expect(toMonthKey(new Date('2026-12-01T02:30:00Z'))).toBe('2026-11');
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
