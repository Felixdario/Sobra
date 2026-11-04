import { z } from 'zod';
import { hexColorSchema, iconSchema, idSchema, isoDateTimeSchema, nameSchema } from './common';

export const CATEGORY_KINDS = ['income', 'expense'] as const;

export const categoryKindSchema = z.enum(CATEGORY_KINDS, {
  error: 'Tipo de categoria inválido: use receita (income) ou despesa (expense)',
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
    error: 'Informe ao menos um campo para atualizar',
  });

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: categoryKindSchema,
  color: hexColorSchema,
  icon: iconSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type Category = z.infer<typeof categorySchema>;
