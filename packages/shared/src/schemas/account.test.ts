import { describe, expect, it } from 'vitest';
import { accountCreateSchema, accountSchema, accountUpdateSchema } from './account';

const validCreate = {
  name: ' Nubank ',
  type: 'credit_card',
  color: '#8a05be',
  icon: 'credit-card',
};

describe('accountCreateSchema', () => {
  it('trims the name, defaults the initial balance to zero and normalizes the color', () => {
    expect(accountCreateSchema.parse(validCreate)).toEqual({
      name: 'Nubank',
      type: 'credit_card',
      initialBalance: 0,
      color: '#8A05BE',
      icon: 'credit-card',
    });
  });

  it('accepts a negative initial balance (credit card debt)', () => {
    expect(
      accountCreateSchema.parse({ ...validCreate, initialBalance: -125_090 }).initialBalance,
    ).toBe(-125_090);
  });

  it('rejects a float initial balance', () => {
    const result = accountCreateSchema.safeParse({ ...validCreate, initialBalance: 10.5 });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['initialBalance'],
      message: 'O valor deve ser um número inteiro de centavos',
    });
  });

  it('rejects an unknown type, an invalid color and a long name', () => {
    expect(
      accountCreateSchema.safeParse({ ...validCreate, type: 'investment' }).error?.issues[0]
        ?.message,
    ).toBe('Tipo de conta inválido');
    expect(accountCreateSchema.safeParse({ ...validCreate, color: 'purple' }).success).toBe(false);
    expect(
      accountCreateSchema.safeParse({ ...validCreate, name: 'a'.repeat(61) }).error?.issues[0]
        ?.message,
    ).toBe('O nome deve ter no máximo 60 caracteres');
    expect(accountCreateSchema.safeParse({ ...validCreate, name: 'a'.repeat(60) }).success).toBe(
      true,
    );
  });
});

describe('accountUpdateSchema', () => {
  it('accepts a partial update such as archiving', () => {
    expect(accountUpdateSchema.parse({ archived: true })).toEqual({ archived: true });
  });

  it('rejects an empty update and does not allow changing the type', () => {
    expect(accountUpdateSchema.safeParse({}).error?.issues[0]?.message).toBe(
      'Informe ao menos um campo para atualizar',
    );
    expect(accountUpdateSchema.safeParse({ type: 'cash' }).success).toBe(false);
  });
});

describe('accountSchema', () => {
  it('includes the computed balance', () => {
    const account = accountSchema.parse({
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      name: 'Carteira',
      type: 'cash',
      initialBalance: 5000,
      balance: 3250,
      color: '#22C55E',
      icon: 'wallet',
      archived: false,
      createdAt: '2026-11-04T12:00:00.000Z',
      updatedAt: '2026-11-04T12:00:00.000Z',
    });
    expect(account.balance).toBe(3250);
  });
});
