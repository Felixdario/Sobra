import type {
  accountSchema,
  categorySchema,
  monthSummarySchema,
  transactionSchema,
  userSchema,
} from '@sobra/shared';
import type { z } from 'zod';

export type { BudgetVsActual, SpendingByCategory } from '@sobra/shared';

/** Wire shapes (what the API sends), before the client's schemas brand them. */
export type AccountInput = z.input<typeof accountSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type MonthSummaryInput = z.input<typeof monthSummarySchema>;
export type TransactionInput = z.input<typeof transactionSchema>;
export type UserInput = z.input<typeof userSchema>;
