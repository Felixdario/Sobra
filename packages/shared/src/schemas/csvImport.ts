import { z } from 'zod';
import { idSchema, isoDateTimeSchema, localDateSchema, positiveCentsSchema } from './common';

export const CSV_IMPORT_MAX_ROWS = 2000;
export const CSV_TEXT_MAX = 2_000_000;
export const CSV_CELL_MAX = 500;

const rawCellSchema = (field: string) =>
  z
    .string({ error: `Coluna ${field} ausente` })
    .trim()
    .max(CSV_CELL_MAX, { error: `Coluna ${field} longa demais` });

/**
 * A statement row as read from the file, before interpretation. Cells may be empty: the
 * preview reports the problem on that row instead of rejecting the whole request.
 */
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

const fileNameSchema = z.string().trim().min(1).max(200);

/** The file's text, parsed by the API (delimiter and header are detected). */
export const csvImportTextRequestSchema = z.object({
  accountId: idSchema,
  csv: z
    .string({ error: 'Envie o conteúdo do arquivo CSV' })
    .min(1, { error: 'O arquivo está vazio' })
    .max(CSV_TEXT_MAX, { error: 'O arquivo é grande demais' }),
  fileName: fileNameSchema.optional(),
});

/** Rows already split into columns by the client. */
export const csvImportRowsRequestSchema = z.object({
  accountId: idSchema,
  rows: rowsSchema(csvImportRowSchema),
});

export const csvImportPreviewRequestSchema = z.union([
  csvImportTextRequestSchema,
  csvImportRowsRequestSchema,
]);

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
  force: z
    .boolean({ error: 'O campo force deve ser verdadeiro ou falso' })
    .default(false)
    .describe('Importa também as linhas que já existem na conta'),
  fileName: fileNameSchema.optional(),
});

export const csvImportCommitResultSchema = z.object({
  batchId: idSchema,
  imported: z.int().min(0),
  skipped: z.int().min(0),
});

export const importBatchSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  fileName: z.string().nullable(),
  rowCount: z.int().min(0),
  importedCount: z.int().min(0),
  skippedCount: z.int().min(0),
  createdAt: isoDateTimeSchema,
});

export type CsvImportRow = z.infer<typeof csvImportRowSchema>;
export type CsvImportTextRequest = z.infer<typeof csvImportTextRequestSchema>;
export type CsvImportRowsRequest = z.infer<typeof csvImportRowsRequestSchema>;
export type CsvImportPreviewRequest = z.infer<typeof csvImportPreviewRequestSchema>;
export type CsvImportPreviewRequestInput = z.input<typeof csvImportPreviewRequestSchema>;
export type CsvMappedRow = z.infer<typeof csvMappedRowSchema>;
export type CsvImportPreviewRow = z.infer<typeof csvImportPreviewRowSchema>;
export type CsvImportPreview = z.infer<typeof csvImportPreviewSchema>;
export type CsvImportPreviewInput = z.input<typeof csvImportPreviewSchema>;
export type CsvImportCommitRow = z.infer<typeof csvImportCommitRowSchema>;
export type CsvImportCommitRequest = z.infer<typeof csvImportCommitRequestSchema>;
export type CsvImportCommitRequestInput = z.input<typeof csvImportCommitRequestSchema>;
export type CsvImportCommitResult = z.infer<typeof csvImportCommitResultSchema>;
export type ImportBatch = z.infer<typeof importBatchSchema>;
