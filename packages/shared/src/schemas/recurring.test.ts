import { describe, expect, it } from 'vitest';
import {
  recurrenceRuleSchema,
  recurringCreateSchema,
  recurringSchema,
  recurringUpdateSchema,
} from './recurring';

const accountId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const otherAccountId = '0190f5b3-7c1e-7a2b-8c3d-4e5f60718293';
const categoryId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const rule = { frequency: 'monthly', startDate: '2026-11-01', dayOfMonth: 5 };
const template = {
  type: 'expense',
  accountId,
  categoryId,
  amount: 12_990,
  description: 'Internet',
};

describe('recurrenceRuleSchema', () => {
  it('defaults the interval to 1', () => {
    expect(recurrenceRuleSchema.parse(rule)).toEqual({ ...rule, interval: 1 });
  });

  it('accepts an end date equal to the start date', () => {
    expect(recurrenceRuleSchema.safeParse({ ...rule, endDate: '2026-11-01' }).success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = recurrenceRuleSchema.safeParse({ ...rule, endDate: '2026-10-31' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['endDate'],
      message: 'A data final deve ser igual ou posterior à data inicial',
    });
  });

  it('rejects interval 0, a float interval and day 32', () => {
    expect(recurrenceRuleSchema.safeParse({ ...rule, interval: 0 }).error?.issues[0]?.message).toBe(
      'O intervalo deve ser no mínimo 1',
    );
    expect(recurrenceRuleSchema.safeParse({ ...rule, interval: 1.5 }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ ...rule, dayOfMonth: 32 }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ ...rule, dayOfMonth: 31 }).success).toBe(true);
  });

  it('rejects dayOfMonth on a weekly rule and an invalid start date', () => {
    expect(recurrenceRuleSchema.safeParse({ ...rule, frequency: 'weekly' }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ ...rule, startDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(recurrenceRuleSchema.safeParse({ ...rule, frequency: 'daily' }).success).toBe(false);
  });
});

describe('recurringCreateSchema', () => {
  it('accepts an expense template without a date', () => {
    expect(recurringCreateSchema.safeParse({ rule, template }).success).toBe(true);
  });

  it('accepts a recurring transfer and rejects one to the same account', () => {
    const transfer = {
      type: 'transfer',
      accountId,
      toAccountId: otherAccountId,
      amount: 50_000,
      description: 'Reserva mensal',
    };
    expect(recurringCreateSchema.safeParse({ rule, template: transfer }).success).toBe(true);
    expect(
      recurringCreateSchema.safeParse({
        rule,
        template: { ...transfer, toAccountId: accountId },
      }).success,
    ).toBe(false);
  });

  it('rejects a float amount in the template', () => {
    expect(
      recurringCreateSchema.safeParse({ rule, template: { ...template, amount: 10.5 } }).success,
    ).toBe(false);
  });
});

describe('recurringUpdateSchema', () => {
  it('accepts pausing and rejects an empty update', () => {
    expect(recurringUpdateSchema.parse({ active: false })).toEqual({ active: false });
    expect(recurringUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('recurringSchema', () => {
  it('parses a response with a nullable next occurrence', () => {
    expect(
      recurringSchema.safeParse({
        id: '9b2f9c56-5c3a-4b6e-9d4f-1a2b3c4d5e6f',
        rule: { ...rule, interval: 1 },
        template,
        active: true,
        nextOccurrence: null,
        createdAt: '2026-11-04T12:00:00.000Z',
        updatedAt: '2026-11-04T12:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});
