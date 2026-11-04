import { describe, expect, it } from 'vitest';
import {
  csvImportCommitRequestSchema,
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

  it('rejects empty cells in pt-BR', () => {
    const result = csvImportRowSchema.safeParse({ ...rawRow, amount: '  ' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['amount'],
      message: 'Coluna valor vazia',
    });
  });

  it('rejects a numeric amount (must be the raw string)', () => {
    expect(csvImportRowSchema.safeParse({ ...rawRow, amount: -1234.56 }).success).toBe(false);
  });
});

describe('csvImportPreviewRequestSchema', () => {
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

  it('accepts confirmed rows in cents', () => {
    expect(csvImportCommitRequestSchema.safeParse({ accountId, rows: [row] }).success).toBe(true);
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
