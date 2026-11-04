import { describe, expect, it } from 'vitest';
import {
  csvImportCommitRequestSchema,
  csvImportCommitResultSchema,
  csvImportPreviewRequestSchema,
  csvImportPreviewSchema,
  csvImportRowSchema,
} from './csvImport';

const accountId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const categoryId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const rawRow = { date: '04/11/2026', description: 'PIX MERCADO', amount: '-R$ 1.234,56' };

describe('csvImportRowSchema', () => {
  it('keeps the raw statement strings, trimmed', () => {
    expect(csvImportRowSchema.parse({ ...rawRow, amount: '  -1234,56 ' }).amount).toBe('-1234,56');
  });

  it('accepts empty cells (the preview flags the row) but not missing columns', () => {
    expect(csvImportRowSchema.parse({ ...rawRow, amount: '  ' }).amount).toBe('');
    const result = csvImportRowSchema.safeParse({ date: rawRow.date, amount: rawRow.amount });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['description'],
      message: 'Coluna descrição ausente',
    });
  });

  it('rejects a numeric amount (must be the raw string)', () => {
    expect(csvImportRowSchema.safeParse({ ...rawRow, amount: -1234.56 }).success).toBe(false);
  });
});

describe('csvImportPreviewRequestSchema', () => {
  it('accepts the CSV text with an optional file name', () => {
    const request = { accountId, csv: 'Data;Valor\n04/11/2026;-1,00', fileName: ' extrato.csv ' };
    expect(csvImportPreviewRequestSchema.parse(request)).toEqual({
      ...request,
      fileName: 'extrato.csv',
    });
    expect(csvImportPreviewRequestSchema.safeParse({ accountId, csv: '' }).success).toBe(false);
  });

  it('requires at least one row', () => {
    expect(csvImportPreviewRequestSchema.safeParse({ accountId, rows: [rawRow] }).success).toBe(
      true,
    );
    expect(
      csvImportPreviewRequestSchema.safeParse({ accountId, rows: [] }).error?.issues[0]?.message,
    ).toBe('O arquivo não tem linhas para importar');
  });
});

describe('csvImportPreviewSchema', () => {
  it('parses mapped, invalid and duplicate rows', () => {
    const preview = {
      accountId,
      rows: [
        {
          rowNumber: 1,
          raw: rawRow,
          mapped: {
            date: '2026-11-04',
            description: 'PIX MERCADO',
            type: 'expense',
            amount: 123_456,
          },
          error: null,
          suggestedCategoryId: categoryId,
          duplicate: true,
        },
        {
          rowNumber: 2,
          raw: { ...rawRow, date: '31/02/2026' },
          mapped: null,
          error: 'Data inválida',
          suggestedCategoryId: null,
          duplicate: false,
        },
      ],
      validCount: 1,
      invalidCount: 1,
      duplicateCount: 1,
    };
    expect(csvImportPreviewSchema.safeParse(preview).success).toBe(true);
  });
});

describe('csvImportCommitRequestSchema', () => {
  const row = {
    date: '2026-11-04',
    description: 'PIX MERCADO',
    type: 'expense',
    amount: 123_456,
    categoryId,
  };

  it('accepts confirmed rows in cents, with force defaulting to false', () => {
    expect(csvImportCommitRequestSchema.parse({ accountId, rows: [row] })).toMatchObject({
      force: false,
    });
    expect(
      csvImportCommitRequestSchema.parse({
        accountId,
        rows: [row],
        force: true,
        fileName: 'extrato.csv',
      }),
    ).toMatchObject({ force: true, fileName: 'extrato.csv' });
    expect(
      csvImportCommitRequestSchema.safeParse({ accountId, rows: [row], force: 'sim' }).success,
    ).toBe(false);
  });

  it('rejects float amounts, zero, transfers and missing categories', () => {
    const parse = (patch: object) =>
      csvImportCommitRequestSchema.safeParse({ accountId, rows: [{ ...row, ...patch }] }).success;
    expect(parse({ amount: 1234.56 })).toBe(false);
    expect(parse({ amount: 0 })).toBe(false);
    expect(parse({ type: 'transfer' })).toBe(false);
    expect(parse({ categoryId: undefined })).toBe(false);
    expect(parse({ date: '2026-02-30' })).toBe(false);
  });
});

describe('csvImportCommitResultSchema', () => {
  it('includes the batch id', () => {
    expect(
      csvImportCommitResultSchema.safeParse({ batchId: categoryId, imported: 1, skipped: 0 })
        .success,
    ).toBe(true);
    expect(csvImportCommitResultSchema.safeParse({ imported: 1, skipped: 0 }).success).toBe(false);
  });
});
