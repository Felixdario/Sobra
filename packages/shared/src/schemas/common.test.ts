import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import type { MonthKey } from '../date/month';
import {
  apiErrorSchema,
  centsSchema,
  healthResponseSchema,
  hexColorSchema,
  iconSchema,
  idSchema,
  installZodPtBR,
  localDateSchema,
  monthKeySchema,
  paginated,
  paginationQuerySchema,
  positiveCentsSchema,
  sortSchema,
} from './common';

function firstMessage(result: { success: boolean; error?: z.ZodError }): string | undefined {
  return result.error?.issues[0]?.message;
}

describe('idSchema', () => {
  it('accepts UUID v4 and v7', () => {
    expect(idSchema.safeParse('3f2504e0-4f89-41d3-9a0c-0305e82c3301').success).toBe(true);
    expect(idSchema.safeParse('0190f5b3-7c1e-7a2b-8c3d-4e5f60718293').success).toBe(true);
  });

  it('rejects cuid and garbage with a pt-BR message', () => {
    const result = idSchema.safeParse('cjld2cjxh0000qzrmn831i7rn');
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Identificador inválido');
  });
});

describe('centsSchema', () => {
  it('accepts safe integers, including negatives and zero', () => {
    expect(centsSchema.parse(-1500)).toBe(-1500);
    expect(centsSchema.parse(0)).toBe(0);
  });

  it('rejects floats, unsafe integers and numeric strings', () => {
    const float = centsSchema.safeParse(10.5);
    expect(float.success).toBe(false);
    expect(firstMessage(float)).toBe('O valor deve ser um número inteiro de centavos');
    expect(centsSchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
    expect(centsSchema.safeParse(Number.NaN).success).toBe(false);
    expect(centsSchema.safeParse('1000').success).toBe(false);
  });
});

describe('positiveCentsSchema', () => {
  it('accepts values above zero', () => {
    expect(positiveCentsSchema.parse(1)).toBe(1);
  });

  it('rejects zero, negatives and floats', () => {
    const zero = positiveCentsSchema.safeParse(0);
    expect(zero.success).toBe(false);
    expect(firstMessage(zero)).toBe('O valor deve ser maior que zero');
    expect(positiveCentsSchema.safeParse(-1).success).toBe(false);
    expect(positiveCentsSchema.safeParse(10.5).success).toBe(false);
  });
});

describe('hexColorSchema', () => {
  it('accepts #RRGGBB and normalizes to upper case', () => {
    expect(hexColorSchema.parse('#a1b2c3')).toBe('#A1B2C3');
  });

  it.each(['#fff', 'a1b2c3', '#GGGGGG', '#a1b2c3ff', 'red'])('rejects %s', (value) => {
    const result = hexColorSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Cor inválida: use o formato #RRGGBB');
  });
});

describe('iconSchema', () => {
  it('accepts a known icon and rejects an unknown one', () => {
    expect(iconSchema.parse('piggy-bank')).toBe('piggy-bank');
    expect(firstMessage(iconSchema.safeParse('rocket'))).toBe('Ícone inválido');
  });
});

describe('monthKeySchema', () => {
  it('accepts YYYY-MM and produces a MonthKey', () => {
    const key = monthKeySchema.parse('2026-12');
    expect(key).toBe('2026-12');
    expectTypeOf(key).toEqualTypeOf<MonthKey>();
  });

  it.each(['2026-13', '2026-00', '2026-1', '26-01', '2026-01-01', '0999-01'])(
    'rejects %s',
    (value) => {
      const result = monthKeySchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe('Mês inválido: use o formato AAAA-MM');
    },
  );
});

describe('localDateSchema', () => {
  it('accepts real dates, including leap days', () => {
    expect(localDateSchema.parse('2026-11-04')).toBe('2026-11-04');
    expect(localDateSchema.parse('2028-02-29')).toBe('2028-02-29');
  });

  it.each([
    '2026-02-30',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '04/11/2026',
    '2026-11-04T00:00',
  ])('rejects %s', (value) => {
    const result = localDateSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      'Data inválida: use o formato AAAA-MM-DD com uma data existente',
    );
  });
});

describe('paginationQuerySchema', () => {
  it('coerces query-string numbers and applies defaults', () => {
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(paginationQuerySchema.parse({ page: '', pageSize: '' })).toEqual({
      page: 1,
      pageSize: 20,
    });
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('rejects out-of-range and non-numeric values', () => {
    expect(firstMessage(paginationQuerySchema.safeParse({ page: '0' }))).toBe(
      'A página deve ser no mínimo 1',
    );
    expect(firstMessage(paginationQuerySchema.safeParse({ pageSize: '101' }))).toBe(
      'O tamanho da página deve ser no máximo 100',
    );
    expect(paginationQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ page: '1.5' }).success).toBe(false);
  });
});

describe('sortSchema', () => {
  const schema = sortSchema(['date', 'amount'], { field: 'date', direction: 'desc' });

  it('parses "field:direction" and falls back to the default', () => {
    expect(schema.parse('amount:asc')).toEqual({ field: 'amount', direction: 'asc' });
    expect(schema.parse('amount')).toEqual({ field: 'amount', direction: 'desc' });
    expect(schema.parse(undefined)).toEqual({ field: 'date', direction: 'desc' });
    expect(schema.parse('')).toEqual({ field: 'date', direction: 'desc' });
  });

  it('rejects unknown fields and directions', () => {
    expect(firstMessage(schema.safeParse('password:asc'))).toBe('Campo de ordenação inválido');
    expect(schema.safeParse('date:up').success).toBe(false);
  });
});

describe('paginated', () => {
  it('wraps an item schema in a page envelope', () => {
    const schema = paginated(monthKeySchema);
    const page = { items: ['2026-01'], page: 1, pageSize: 20, total: 1, totalPages: 1 };
    expect(schema.parse(page)).toEqual(page);
    expect(schema.safeParse({ ...page, items: ['2026-13'] }).success).toBe(false);
  });
});

describe('healthResponseSchema', () => {
  it('accepts only status ok', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(healthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });
});

describe('apiErrorSchema', () => {
  it('accepts errors with and without details', () => {
    expect(
      apiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Conta não encontrada' } })
        .success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({
        error: { code: 'VALIDATION', message: 'Dados inválidos', details: [{ path: 'name' }] },
      }).success,
    ).toBe(true);
    expect(apiErrorSchema.safeParse({ error: { code: '', message: 'x' } }).success).toBe(false);
  });
});

describe('installZodPtBR', () => {
  it('translates generic Zod messages to pt-BR', () => {
    installZodPtBR();
    try {
      const result = z.object({ name: z.string() }).safeParse({});
      expect(firstMessage(result)).toMatch(/^Entrada inválida: esperava um texto/);
    } finally {
      z.config(z.locales.en());
    }
  });
});
