import { z } from 'zod';
import { idSchema, localDateSchema, positiveCentsSchema } from './common';

export const CSV_IMPORT_MAX_ROWS = 2000;

const rawCellSchema = (field: string) =>
  z
    .string({ error: `Coluna ${field} ausente` })
    .trim()
    .min(1, { error: `Coluna ${field} vazia` })
    .max(500, { error: `Coluna ${field} longa demais` });

export const csvImportRowSchema = z.object({
  date: rawCellSchema('data'),
  description: rawCellSchema('descrição'),
  amount: rawCellSchema('valor'),
});

const rowsSchema = <T extends z.ZodType>(row: T) =>
  z
    .array(row)
    .min(1, { error: 'O arquivo não tem linhas para importar' })
    .max(CSV_IMPORT_MAX_ROWS, {
      error: `O arquivo deve ter no máximo ${CSV_IMPORT_MAX_ROWS} linhas`,
    });

export const csvImportPreviewRequestSchema = z.object({
  accountId: idSchema,
  rows: rowsSchema(csvImportRowSchema),
});

export const csvImportedTypeSchema = z.enum(['income', 'expense'], {
  error: 'Tipo inválido: use income ou expense',
});

export const csvMappedRowSchema = z.object({
  date: localDateSchema,
  description: z.string().trim().min(1).max(120),
  type: csvImportedTypeSchema,
  amount: positiveCentsSchema,
});

export const csvImportPreviewRowSchema = z.object({
  rowNumber: z.int().min(1),
  raw: csvImportRowSchema,
  mapped: csvMappedRowSchema.nullable(),
  error: z.string().nullable(),
  suggestedCategoryId: idSchema.nullable(),
  duplicate: z.boolean(),
});

export const csvImportPreviewSchema = z.object({
  accountId: idSchema,
  rows: z.array(csvImportPreviewRowSchema),
  validCount: z.int().min(0),
  invalidCount: z.int().min(0),
  duplicateCount: z.int().min(0),
});

export const csvImportCommitRowSchema = csvMappedRowSchema.extend({
  categoryId: z.uuid({ error: 'Informe uma categoria válida' }),
});

export const csvImportCommitRequestSchema = z.object({
  accountId: idSchema,
  rows: rowsSchema(csvImportCommitRowSchema),
});

export const csvImportCommitResultSchema = z.object({
  imported: z.int().min(0),
  skipped: z.int().min(0),
});

export type CsvImportRow = z.infer<typeof csvImportRowSchema>;
export type CsvImportPreviewRequest = z.infer<typeof csvImportPreviewRequestSchema>;
export type CsvMappedRow = z.infer<typeof csvMappedRowSchema>;
export type CsvImportPreviewRow = z.infer<typeof csvImportPreviewRowSchema>;
export type CsvImportPreview = z.infer<typeof csvImportPreviewSchema>;
export type CsvImportPreviewInput = z.input<typeof csvImportPreviewSchema>;
export type CsvImportCommitRow = z.infer<typeof csvImportCommitRowSchema>;
export type CsvImportCommitRequest = z.infer<typeof csvImportCommitRequestSchema>;
export type CsvImportCommitRequestInput = z.input<typeof csvImportCommitRequestSchema>;
export type CsvImportCommitResult = z.infer<typeof csvImportCommitResultSchema>;
