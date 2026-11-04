import {
  paginated,
  transactionSchema,
  type Account,
  type AccountCreateInput,
  type AccountUpdateInput,
  type BudgetCopyInput,
  type BudgetUpsertInput,
  type CategoryKind,
  type CsvImportCommitRequestInput,
  type CsvImportPreviewRequestInput,
  type RecurringCreateInput,
  type RecurringUpdateInput,
  type SortDirection,
  type TRANSACTION_SORT_FIELDS,
  type TransactionCreateInput,
  type TransactionType,
  type TransactionUpdateInput,
  type categoryCreateSchema,
  type categoryUpdateSchema,
  type loginSchema,
  type registerSchema,
} from '@financas/shared';
import type { z } from 'zod';

/** `GET /transactions` response, validated by the client: `paginated(transactionSchema)`. */
export const transactionPageSchema = paginated(transactionSchema);
export type TransactionPage = z.output<typeof transactionPageSchema>;

// Request bodies are the *input* side of the shared schemas (what the API accepts).
export type RegisterBody = z.input<typeof registerSchema>;
export type LoginBody = z.input<typeof loginSchema>;
export type AccountCreateBody = AccountCreateInput;
export type AccountUpdateBody = AccountUpdateInput;
export type CategoryCreateBody = z.input<typeof categoryCreateSchema>;
export type CategoryUpdateBody = z.input<typeof categoryUpdateSchema>;
export type TransactionCreateBody = TransactionCreateInput;
export type TransactionUpdateBody = TransactionUpdateInput;
export type BudgetUpsertBody = BudgetUpsertInput;
export type BudgetCopyBody = BudgetCopyInput;
export type RecurringCreateBody = RecurringCreateInput;
export type RecurringUpdateBody = RecurringUpdateInput;
export type ImportPreviewBody = CsvImportPreviewRequestInput;
export type ImportCommitBody = CsvImportCommitRequestInput;

/*
 * Query strings. The shared filter schemas preprocess raw strings (`z.input` is `unknown` there),
 * so the accepted shapes are spelled out here, with the shared enums. `undefined` is allowed so
 * screens can pass their filter state as is.
 */
export type AccountListParams = { includeArchived?: boolean | undefined };

export type CategoryListParams = { kind?: CategoryKind | undefined };

export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

export type TransactionListParams = {
  page?: number | undefined;
  pageSize?: number | undefined;
  /** "AAAA-MM" */
  month?: string | undefined;
  accountId?: string | undefined;
  categoryId?: string | undefined;
  type?: TransactionType | undefined;
  search?: string | undefined;
  /** `"date"` or `"date:asc"`; default `date:desc`. */
  sort?: TransactionSortField | `${TransactionSortField}:${SortDirection}` | undefined;
};

export type SummaryMonthParams = {
  /** "AAAA-MM" */
  month: string;
  accountId?: string | undefined;
};

export type SummaryRangeParams = {
  /** "AAAA-MM" */
  from: string;
  /** "AAAA-MM" */
  to: string;
  accountId?: string | undefined;
  granularity?: 'day' | 'month' | undefined;
};

/** `DELETE /accounts/:id`: 204 when deleted, 200 with the account when it had transactions. */
export type AccountRemoval = { status: 'deleted' } | { status: 'archived'; account: Account };
