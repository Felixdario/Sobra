import { z } from 'zod';
import { isMonthKey, monthKey, type MonthKey } from '../date/month';
import { cents, type Cents } from '../money/cents';

export function installZodPtBR(): void {
  z.config(z.locales.ptBR());
}

export const idSchema = z.uuid({ error: 'Identificador inválido' });

export const centsSchema = z
  .int({ error: 'O valor deve ser um número inteiro de centavos' })
  .transform((value): Cents => cents(value));

export const positiveCentsSchema = z
  .int({ error: 'O valor deve ser um número inteiro de centavos' })
  .positive({ error: 'O valor deve ser maior que zero' })
  .transform((value): Cents => cents(value));

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Cor inválida: use o formato #RRGGBB' })
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

export const iconSchema = z.enum(ICON_NAMES, { error: 'Ícone inválido' });

export const monthKeySchema = z
  .string({ error: 'Mês inválido: use o formato AAAA-MM' })
  .refine(isMonthKey, { error: 'Mês inválido: use o formato AAAA-MM' })
  .transform((value): MonthKey => monthKey(value));

export const localDateSchema = z.iso.date({
  error: 'Data inválida: use o formato AAAA-MM-DD com uma data existente',
});

export const isoDateTimeSchema = z.iso.datetime({ offset: true, error: 'Data e hora inválidas' });

export const nameSchema = (max: number) =>
  z
    .string({ error: 'Informe o nome' })
    .trim()
    .min(1, { error: 'Informe o nome' })
    .max(max, { error: `O nome deve ter no máximo ${max} caracteres` });

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
  .number({ error: 'Página inválida' })
  .int({ error: 'Página inválida' })
  .min(1, { error: 'A página deve ser no mínimo 1' });

export const pageSizeSchema = z.coerce
  .number({ error: 'Tamanho de página inválido' })
  .int({ error: 'Tamanho de página inválido' })
  .min(1, { error: 'O tamanho da página deve ser no mínimo 1' })
  .max(PAGE_SIZE_MAX, { error: `O tamanho da página deve ser no máximo ${PAGE_SIZE_MAX}` });

export const sortDirectionSchema = z.enum(['asc', 'desc'], {
  error: 'Direção de ordenação inválida: use asc ou desc',
});

export function sortSchema<const F extends readonly [string, ...string[]]>(
  fields: F,
  fallback: { field: F[number]; direction: SortDirection },
) {
  const objectSchema = z.object({
    field: z.enum(fields, { error: 'Campo de ordenação inválido' }),
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
