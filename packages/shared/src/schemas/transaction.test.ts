import type { MonthKey } from '../date/month';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  mergeTransactionUpdate,
  transactionCreateSchema,
  transactionFiltersSchema,
  transactionSchema,
  transactionUpdateSchema,
  type TransactionCreate,
  type TransactionFilters,
  type TransactionFiltersInput,
} from './transaction';

const accountId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const otherAccountId = '0190f5b3-7c1e-7a2b-8c3d-4e5f60718293';
const categoryId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const expense = {
  type: 'expense',
  accountId,
  categoryId,
  amount: 4590,
  description: ' Almoço ',
  date: '2026-11-04',
};

const transfer = {
  type: 'transfer',
  accountId,
  toAccountId: otherAccountId,
  amount: 50_000,
  description: 'Reserva',
  date: '2026-11-05',
};

function messageAt(
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  key: string,
) {
  return result.error?.issues.find((issue) => issue.path[0] === key)?.message;
}

describe('transactionCreateSchema', () => {
  it('accepts income and expense with a category', () => {
    expect(transactionCreateSchema.parse(expense)).toEqual({ ...expense, description: 'Almoço' });
    expect(transactionCreateSchema.safeParse({ ...expense, type: 'income' }).success).toBe(true);
  });

  it('requires a category for income and expense', () => {
    const result = transactionCreateSchema.safeParse({ ...expense, categoryId: undefined });
    expect(messageAt(result, 'categoryId')).toBe('Informe uma categoria válida');
  });

  it('accepts a transfer between different accounts and drops any category', () => {
    const parsed = transactionCreateSchema.parse({ ...transfer, categoryId });
    expect(parsed).toEqual(transfer);
    expect(parsed).not.toHaveProperty('categoryId');
  });

  it('rejects a transfer to the same account', () => {
    const result = transactionCreateSchema.safeParse({ ...transfer, toAccountId: accountId });
    expect(result.success).toBe(false);
    expect(messageAt(result, 'toAccountId')).toBe(
      'A conta de destino deve ser diferente da conta de origem',
    );
  });

  it('requires the destination account on a transfer', () => {
    expect(
      messageAt(
        transactionCreateSchema.safeParse({ ...transfer, toAccountId: undefined }),
        'toAccountId',
      ),
    ).toBe('Informe uma conta de destino válida');
  });

  it.each([
    [0, 'O valor deve ser maior que zero'],
    [-100, 'O valor deve ser maior que zero'],
    [10.5, 'O valor deve ser um número inteiro de centavos'],
  ])('rejects amount %s', (amount, message) => {
    expect(messageAt(transactionCreateSchema.safeParse({ ...expense, amount }), 'amount')).toBe(
      message,
    );
  });

  it('validates description, date and notes', () => {
    expect(
      messageAt(
        transactionCreateSchema.safeParse({ ...expense, description: '  ' }),
        'description',
      ),
    ).toBe('Informe a descrição');
    expect(
      transactionCreateSchema.safeParse({ ...expense, description: 'a'.repeat(121) }).success,
    ).toBe(false);
    expect(transactionCreateSchema.safeParse({ ...expense, date: '2026-02-30' }).success).toBe(
      false,
    );
    expect(transactionCreateSchema.safeParse({ ...expense, notes: 'Com a família' }).success).toBe(
      true,
    );
  });

  it('rejects an unknown type in pt-BR', () => {
    const result = transactionCreateSchema.safeParse({ ...expense, type: 'refund' });
    expect(result.error?.issues[0]?.message).toBe(
      'Tipo de transação inválido: use income, expense ou transfer',
    );
  });

  it('narrows the inferred type by discriminant', () => {
    const parsed = transactionCreateSchema.parse(transfer);
    if (parsed.type === 'transfer') expectTypeOf(parsed.toAccountId).toEqualTypeOf<string>();
    else expectTypeOf(parsed.categoryId).toEqualTypeOf<string>();
  });
});

describe('transactionUpdateSchema', () => {
  it('accepts a partial patch and null to clear notes', () => {
    expect(transactionUpdateSchema.parse({ amount: 1000, notes: null })).toEqual({
      amount: 1000,
      notes: null,
    });
  });

  it('rejects an empty patch, a float amount and a same-account patch', () => {
    expect(transactionUpdateSchema.safeParse({}).success).toBe(false);
    expect(transactionUpdateSchema.safeParse({ amount: 10.5 }).success).toBe(false);
    expect(transactionUpdateSchema.safeParse({ accountId, toAccountId: accountId }).success).toBe(
      false,
    );
  });
});

describe('mergeTransactionUpdate', () => {
  const current = transactionCreateSchema.parse({ ...expense, notes: 'antiga' });

  it('applies a simple patch and clears notes with null', () => {
    const patch = transactionUpdateSchema.parse({ amount: 5000, notes: null });
    const result = mergeTransactionUpdate(current, patch);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ...current, amount: 5000, notes: undefined });
    expect(result.data).not.toHaveProperty('notes');
  });

  it('turns an expense into a transfer, dropping the category', () => {
    const patch = transactionUpdateSchema.parse({ type: 'transfer', toAccountId: otherAccountId });
    const result = mergeTransactionUpdate(current, patch);
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('categoryId');
  });

  it('rejects a type change that leaves the record incomplete', () => {
    const asTransfer = mergeTransactionUpdate(
      current,
      transactionUpdateSchema.parse({ type: 'transfer' }),
    );
    expect(asTransfer.success).toBe(false);

    const transferRecord = transactionCreateSchema.parse(transfer);
    const toExpense = mergeTransactionUpdate(
      transferRecord,
      transactionUpdateSchema.parse({ type: 'expense' }),
    );
    expect(toExpense.success).toBe(false);
  });

  it('rejects moving a transfer onto its own destination account', () => {
    const transferRecord = transactionCreateSchema.parse(transfer);
    const result = mergeTransactionUpdate(
      transferRecord,
      transactionUpdateSchema.parse({ accountId: otherAccountId }),
    );
    expect(result.success).toBe(false);
  });

  it('is typed with the create output', () => {
    expectTypeOf(mergeTransactionUpdate).parameter(0).toEqualTypeOf<TransactionCreate>();
  });
});

describe('transactionSchema', () => {
  const meta = {
    id: '9b2f9c56-5c3a-4b6e-9d4f-1a2b3c4d5e6f',
    notes: null,
    createdAt: '2026-11-04T12:00:00.000Z',
    updatedAt: '2026-11-04T12:00:00.000Z',
    account: { id: accountId, name: 'Nubank' },
  };
  const category = { id: categoryId, name: 'Mercado', color: '#f97316', icon: 'cart' };
  const toAccount = { id: otherAccountId, name: 'Poupança' };

  it('parses responses with display fields and nullable notes', () => {
    const parsed = transactionSchema.parse({ ...expense, ...meta, category, toAccount: null });
    expect(parsed.category?.color).toBe('#F97316');
    expect(
      transactionSchema.safeParse({ ...transfer, ...meta, category: null, toAccount }).success,
    ).toBe(true);
  });

  it('requires toAccount on transfers and leaves it null on income and expense', () => {
    expect(
      transactionSchema.safeParse({ ...transfer, ...meta, category: null, toAccount: null })
        .success,
    ).toBe(false);
    expect(transactionSchema.safeParse({ ...expense, ...meta, category, toAccount }).success).toBe(
      false,
    );
  });
});

describe('transactionFiltersSchema', () => {
  it('turns empty query-string values into undefined and applies defaults', () => {
    const filters = transactionFiltersSchema.parse({
      month: '',
      accountId: '',
      categoryId: '',
      type: '',
      search: '   ',
      page: '',
      pageSize: '',
      sort: '',
    });
    expect(filters).toEqual({
      page: 1,
      pageSize: 20,
      sort: { field: 'date', direction: 'desc' },
    });
  });

  it('coerces strings coming from the query string', () => {
    expect(
      transactionFiltersSchema.parse({
        month: '2026-11',
        accountId,
        type: 'expense',
        search: ' mercado ',
        page: '2',
        pageSize: '50',
        sort: 'amount:asc',
      }),
    ).toEqual({
      month: '2026-11',
      accountId,
      type: 'expense',
      search: 'mercado',
      page: 2,
      pageSize: 50,
      sort: { field: 'amount', direction: 'asc' },
    });
  });

  it('uses the first value when a key is repeated', () => {
    expect(transactionFiltersSchema.parse({ month: ['2026-10', '2026-11'] }).month).toBe('2026-10');
  });

  it('rejects invalid filters', () => {
    expect(transactionFiltersSchema.safeParse({ month: '2026-13' }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ type: 'refund' }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ accountId: 'abc' }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });

  it('infers optional filters and required defaults', () => {
    expectTypeOf<TransactionFilters['page']>().toEqualTypeOf<number>();
    expectTypeOf<TransactionFilters['month']>().toEqualTypeOf<MonthKey | undefined>();
    expectTypeOf<Record<string, never>>().toExtend<TransactionFiltersInput>();
  });
});
