import Papa from 'papaparse';
import {
  CSV_CELL_MAX,
  CSV_IMPORT_MAX_ROWS,
  type CsvImportRow,
  type CsvMappedRow,
  csvImportRowSchema,
  csvMappedRowSchema,
  DESCRIPTION_MAX,
  localDateSchema,
  parseBRL,
} from '@financas/shared';
import { badRequest } from '../../lib/errors';

export type ParsedCsvRow = { rowNumber: number; raw: CsvImportRow };

type Columns = { date: number; description: number; amount: number };

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/** "DD/MM/AAAA" or "AAAA-MM-DD" to "AAAA-MM-DD"; `null` when not an existing day. */
export function parseCsvDate(value: string): string | null {
  const trimmed = value.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const key = br ? `${br[3]}-${br[2]}-${br[1]}` : trimmed;
  return localDateSchema.safeParse(key).success ? key : null;
}

/**
 * BRL amount via `parseBRL` ("-1.234,56", "R$ 10"). Also accepts a dot decimal with one or two
 * digits ("-12.34", common in fintech exports): it cannot be a pt-BR thousands group, which
 * always has three digits.
 */
export function parseCsvAmount(value: string): number | null {
  const trimmed = value.trim();
  const dotDecimal = /^([+-]?\d+)\.(\d{1,2})$/.exec(trimmed);
  return parseBRL(dotDecimal ? `${dotDecimal[1]},${dotDecimal[2]}` : trimmed);
}

/** `;` when the first line has one (BRL amounts use the comma), then tab, then comma. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes('\t')) return '\t';
  return ',';
}

const HEADER_PATTERNS: Record<keyof Columns, RegExp> = {
  date: /^(DATA|DATE|DT)\b/,
  description: /(DESCRI|HISTORIC|LANCAMENTO|ESTABELECIMENTO|MEMO|TITULO|TITLE)/,
  amount: /^(VALOR|AMOUNT|QUANTIA|MONTANTE)\b/,
};

function columnsFromHeader(header: string[]): Columns | null {
  const names = header.map(normalizeText);
  const find = (pattern: RegExp) => names.findIndex((name) => pattern.test(name));
  const columns = {
    date: find(HEADER_PATTERNS.date),
    description: find(HEADER_PATTERNS.description),
    amount: find(HEADER_PATTERNS.amount),
  };
  return Object.values(columns).every((index) => index >= 0) ? columns : null;
}

/** Without a header: the column where most cells are dates, then amounts, then the first text one. */
function inferColumns(records: string[][]): Columns {
  const sample = records.slice(0, 20);
  const width = Math.max(...sample.map((record) => record.length));
  const share = (index: number, test: (cell: string) => boolean) =>
    sample.filter((record) => test(record[index] ?? '')).length / sample.length;
  const indexes = [...Array(width).keys()];

  const date = indexes.find((i) => share(i, (cell) => parseCsvDate(cell) !== null) > 0.5) ?? 0;
  const amount =
    indexes.find((i) => i !== date && share(i, (cell) => parseCsvAmount(cell) !== null) > 0.5) ?? 2;
  const description =
    indexes.find(
      (i) => i !== date && i !== amount && share(i, (cell) => cell.trim() !== '') > 0.5,
    ) ?? 1;
  return { date, description, amount };
}

function looksLikeHeader(record: string[]): boolean {
  return !record.some((cell) => parseCsvDate(cell) !== null || parseCsvAmount(cell) !== null);
}

const rawCell = (value: string | undefined) => (value ?? '').trim().slice(0, CSV_CELL_MAX);

/**
 * Splits CSV text into raw rows. Detects the delimiter and an optional header; `rowNumber` is
 * the record's position in the file (the header, when present, is row 1).
 */
export function parseCsvText(text: string): ParsedCsvRow[] {
  const content = text.replace(/^\uFEFF/, '');
  const { data } = Papa.parse<string[]>(content, {
    delimiter: detectDelimiter(content),
    skipEmptyLines: 'greedy',
  });
  if (data.length === 0) throw badRequest('O arquivo não tem linhas para importar');

  const first = data[0] ?? [];
  const hasHeader = looksLikeHeader(first);
  const body = hasHeader ? data.slice(1) : data;
  if (body.length === 0) throw badRequest('O arquivo não tem linhas para importar');
  if (body.length > CSV_IMPORT_MAX_ROWS) {
    throw badRequest(`O arquivo deve ter no máximo ${CSV_IMPORT_MAX_ROWS} linhas`);
  }

  const columns = (hasHeader && columnsFromHeader(first)) || inferColumns(body);
  const offset = hasHeader ? 2 : 1;
  return body.map((record, index) => ({
    rowNumber: index + offset,
    raw: {
      date: rawCell(record[columns.date]),
      description: rawCell(record[columns.description]),
      amount: rawCell(record[columns.amount]),
    },
  }));
}

/** Raw cells to a typed row: negative amount is an expense, positive an income. */
export function mapCsvRow(
  raw: CsvImportRow,
): { mapped: CsvMappedRow; error: null } | { mapped: null; error: string } {
  const cells = csvImportRowSchema.safeParse(raw);
  if (!cells.success)
    return { mapped: null, error: cells.error.issues[0]?.message ?? 'Linha inválida' };
  for (const [label, value] of [
    ['data', raw.date],
    ['descrição', raw.description],
    ['valor', raw.amount],
  ] as const) {
    if (value.trim() === '') return { mapped: null, error: `Coluna ${label} vazia` };
  }

  const date = parseCsvDate(cells.data.date);
  if (!date) return { mapped: null, error: 'Data inválida: use DD/MM/AAAA ou AAAA-MM-DD' };
  const amount = parseCsvAmount(cells.data.amount);
  if (amount === null) return { mapped: null, error: 'Valor inválido: use o formato -1.234,56' };
  if (amount === 0) return { mapped: null, error: 'Valor zero não pode ser importado' };

  const mapped = csvMappedRowSchema.safeParse({
    date,
    description: cells.data.description.slice(0, DESCRIPTION_MAX),
    type: amount < 0 ? 'expense' : 'income',
    amount: Math.abs(amount),
  });
  return mapped.success
    ? { mapped: mapped.data, error: null }
    : { mapped: null, error: mapped.error.issues[0]?.message ?? 'Linha inválida' };
}
