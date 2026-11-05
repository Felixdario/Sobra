import { z } from 'zod';
import { validationMessage } from './messages';
import { isMonthKey, monthKey, type MonthKey } from '../date/month';
import { cents, type Cents } from '../money/cents';

export function installZodPtBR(): void {
  z.config(z.locales.ptBR());
}

export const idSchema = z.uuid({ error: validationMessage('common.idInvalid') });

export const centsSchema = z
  .int({ error: validationMessage('amount.notInteger') })
  .transform((value): Cents => cents(value));

export const positiveCentsSchema = z
  .int({ error: validationMessage('amount.notInteger') })
  .positive({ error: validationMessage('amount.notPositive') })
  .transform((value): Cents => cents(value));

export const hexColorSchema = z
  .string({ error: validationMessage('common.colorInvalid') })
  .regex(/^#[0-9A-Fa-f]{6}$/, { error: validationMessage('common.colorInvalid') })
  .transform((value) => value.toUpperCase());

export const ICON_NAMES = [
  'cart',
  'home',
  'car',
  'bus',
  'utensils',
  'film',
  'heart-pulse',
  'graduation-cap',
  'briefcase',
  'gift',
  'plane',
  'shirt',
  'smartphone',
  'wifi',
  'zap',
  'droplet',
  'piggy-bank',
  'trending-up',
  'wallet',
  'credit-card',
  'receipt',
  'paw',
  'dumbbell',
  'music',
  'coffee',
  'baby',
  'wrench',
  'landmark',
  'sparkles',
  'circle-dollar',
] as const;

export const iconSchema = z.enum(ICON_NAMES, { error: validationMessage('common.iconInvalid') });

export const monthKeySchema = z
  .string({ error: validationMessage('common.monthInvalid') })
  .refine(isMonthKey, { error: validationMessage('common.monthInvalid') })
  .transform((value): MonthKey => monthKey(value));

export const localDateSchema = z.iso.date({
  error: validationMessage('common.dateInvalid'),
});

export const isoDateTimeSchema = z.iso.datetime({
  offset: true,
  error: validationMessage('common.dateTimeInvalid'),
});

export const nameSchema = (max: number) =>
  z
    .string({ error: validationMessage('name.required') })
    .trim()
    .min(1, { error: validationMessage('name.required') })
    .max(max, { error: validationMessage('name.tooLong', { max }) });

function blankToUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return blankToUndefined(value[0]);
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

export function fromQuery<T extends z.ZodType>(schema: T) {
  return z.preprocess(blankToUndefined, schema.optional());
}

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

export const pageSchema = z.coerce
  .number({ error: validationMessage('pagination.pageInvalid') })
  .int({ error: validationMessage('pagination.pageInvalid') })
  .min(1, { error: validationMessage('pagination.pageTooSmall') });

export const pageSizeSchema = z.coerce
  .number({ error: validationMessage('pagination.pageSizeInvalid') })
  .int({ error: validationMessage('pagination.pageSizeInvalid') })
  .min(1, { error: validationMessage('pagination.pageSizeTooSmall') })
  .max(PAGE_SIZE_MAX, {
    error: validationMessage('pagination.pageSizeTooLarge', { max: PAGE_SIZE_MAX }),
  });

export const sortDirectionSchema = z.enum(['asc', 'desc'], {
  error: validationMessage('sort.directionInvalid'),
});

export function sortSchema<const F extends readonly [string, ...string[]]>(
  fields: F,
  fallback: { field: F[number]; direction: SortDirection },
) {
  const objectSchema = z.object({
    field: z.enum(fields, { error: validationMessage('sort.fieldInvalid') }),
    direction: sortDirectionSchema,
  });
  const fromString = z.preprocess((raw) => {
    if (typeof raw !== 'string') return raw;
    const [field, direction = fallback.direction] = raw.split(':');
    return { field, direction };
  }, objectSchema);
  return fromQuery(fromString).transform((value) => value ?? fallback);
}

export const paginationQuerySchema = z.object({
  page: fromQuery(pageSchema).transform((value) => value ?? 1),
  pageSize: fromQuery(pageSizeSchema).transform((value) => value ?? PAGE_SIZE_DEFAULT),
});

export function paginated<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.int().min(1),
    pageSize: z.int().min(1).max(PAGE_SIZE_MAX),
    total: z.int().min(0),
    totalPages: z.int().min(0),
  });
}

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

/**
 * Stable `error.code` values the API sends. The `message` is pt-BR; clients show their own
 * translation of the code and fall back to the message (ADR-035).
 */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCodeName = (typeof API_ERROR_CODES)[number];

/** `code` stays a free string so an older client keeps parsing errors a newer API adds. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type Id = z.infer<typeof idSchema>;
export type IconName = z.infer<typeof iconSchema>;
export type LocalDate = z.infer<typeof localDateSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;
export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
