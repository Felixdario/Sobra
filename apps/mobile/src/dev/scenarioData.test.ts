import {
  accountSchema,
  budgetVsActualSchema,
  categorySchema,
  monthSummarySchema,
  spendingByCategorySchema,
  transactionSchema,
  userSchema,
} from '@financas/shared';
import { newUser, oneTransaction, worstCase } from './scenarioData';

/** The scenarios must be data the API could really send: the client validates every response. */
describe.each([
  ['pior caso', worstCase],
  ['usuário novo', newUser],
  ['uma transação', oneTransaction],
])('dados do cenário %s', (_name, data) => {
  it('passam nos schemas do contrato', () => {
    expect(() => userSchema.parse(data.user)).not.toThrow();
    for (const item of data.accounts) expect(() => accountSchema.parse(item)).not.toThrow();
    for (const item of data.categories) expect(() => categorySchema.parse(item)).not.toThrow();
    for (const item of data.transactions) {
      const result = transactionSchema.safeParse(item);
      expect(result.error?.issues ?? []).toEqual([]);
    }
    expect(() => monthSummarySchema.parse(data.summary('2026-11' as never))).not.toThrow();
    expect(() => spendingByCategorySchema.parse(data.spending('2026-11' as never))).not.toThrow();
    expect(() => budgetVsActualSchema.parse(data.budgets('2026-11' as never))).not.toThrow();
  });
});

it('o pior caso chega aos limites do contrato', () => {
  expect(worstCase.transactions.some((tx) => tx.description.length === 120)).toBe(true);
  expect(worstCase.categories.filter((c) => c.kind === 'expense').length).toBeGreaterThanOrEqual(
    13,
  );
  expect(Math.max(...worstCase.categories.map((c) => c.name.length))).toBe(40);
});
