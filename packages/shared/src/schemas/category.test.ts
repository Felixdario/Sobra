import { describe, expect, it } from 'vitest';
import { categoryCreateSchema, categorySchema, categoryUpdateSchema } from './category';

const validCreate = { name: 'Mercado', kind: 'expense', color: '#F97316', icon: 'cart' };

describe('categoryCreateSchema', () => {
  it('accepts a valid category', () => {
    expect(categoryCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('rejects an unknown kind, icon or color', () => {
    expect(categoryCreateSchema.safeParse({ ...validCreate, kind: 'transfer' }).success).toBe(
      false,
    );
    expect(
      categoryCreateSchema.safeParse({ ...validCreate, icon: 'rocket' }).error?.issues[0]?.message,
    ).toBe('Ícone inválido');
    expect(categoryCreateSchema.safeParse({ ...validCreate, color: '#F97' }).success).toBe(false);
  });
});

describe('categoryUpdateSchema', () => {
  it('accepts a partial update', () => {
    expect(categoryUpdateSchema.parse({ name: 'Supermercado' })).toEqual({ name: 'Supermercado' });
  });

  it('keeps the kind immutable', () => {
    expect(categoryUpdateSchema.safeParse({ kind: 'income' }).success).toBe(false);
  });
});

describe('categorySchema', () => {
  it('parses a response', () => {
    expect(
      categorySchema.safeParse({
        ...validCreate,
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        createdAt: '2026-11-04T12:00:00.000Z',
        updatedAt: '2026-11-04T12:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});

describe('systemKey', () => {
  const response = {
    ...validCreate,
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    createdAt: '2026-11-04T12:00:00.000Z',
    updatedAt: '2026-11-04T12:00:00.000Z',
  };

  it('aceita uma chave padrão ou null, e vira null quando uma API antiga não manda', () => {
    expect(categorySchema.parse({ ...response, systemKey: 'groceries' }).systemKey).toBe(
      'groceries',
    );
    expect(categorySchema.parse({ ...response, systemKey: null }).systemKey).toBeNull();
    expect(categorySchema.parse(response).systemKey).toBeNull();
    expect(categorySchema.safeParse({ ...response, systemKey: 'pets' }).success).toBe(false);
  });

  it('não é aceito na criação nem na edição', () => {
    expect(categoryCreateSchema.parse({ ...validCreate, systemKey: 'other' })).not.toHaveProperty(
      'systemKey',
    );
  });
});
