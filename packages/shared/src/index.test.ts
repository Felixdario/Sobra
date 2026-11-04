import { describe, expect, it } from 'vitest';
import { APP_NAME, formatBRL, healthResponseSchema } from './index';

describe('@financas/shared', () => {
  it('expõe o nome do app', () => {
    expect(APP_NAME).toBe('Finanças');
  });

  it('formata valores em BRL', () => {
    expect(formatBRL(1234.56)).toBe('R$ 1.234,56');
  });

  it('valida a resposta de saúde', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(healthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });
});
