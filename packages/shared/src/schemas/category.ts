import { z } from 'zod';
import { validationMessage } from './messages';
import { hexColorSchema, iconSchema, idSchema, isoDateTimeSchema, nameSchema } from './common';

export const CATEGORY_KINDS = ['income', 'expense'] as const;

/**
 * Stable ids of the categories every account starts with (ADR-035). While `systemKey` is set,
 * clients show the translated name (`categories.default.<key>` in @sobra/i18n) instead of `name`;
 * renaming the category clears it.
 */
export const DEFAULT_CATEGORY_KEYS = [
  'salary',
  'freelance',
  'investments',
  'housing',
  'groceries',
  'transport',
  'restaurants',
  'leisure',
  'health',
  'education',
  'subscriptions',
  'shopping',
  'other',
] as const;

export const categorySystemKeySchema = z.enum(DEFAULT_CATEGORY_KEYS);

/** Default `null` only lets a newer client read an older API; the API always sends it. */
export const nullableSystemKeySchema = categorySystemKeySchema.nullable().default(null);

export const categoryKindSchema = z.enum(CATEGORY_KINDS, {
  error: validationMessage('category.kindInvalid'),
});

const categoryNameSchema = nameSchema(40);

export const categoryCreateSchema = z.object({
  name: categoryNameSchema,
  kind: categoryKindSchema,
  color: hexColorSchema,
  icon: iconSchema,
});

export const categoryUpdateSchema = z
  .object({
    name: categoryNameSchema,
    color: hexColorSchema,
    icon: iconSchema,
  })
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: validationMessage('common.updateEmpty'),
  });

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: categoryKindSchema,
  color: hexColorSchema,
  icon: iconSchema,
  systemKey: nullableSystemKeySchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type CategorySystemKey = z.infer<typeof categorySystemKeySchema>;
export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type Category = z.infer<typeof categorySchema>;
