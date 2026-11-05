import { resolveIssue, translateIssue, type Translator } from '@sobra/i18n';

const COLUMNS = {
  data: 'web.imports.rowErrors.columns.date',
  descrição: 'web.imports.rowErrors.columns.description',
  valor: 'web.imports.rowErrors.columns.amount',
} as const;

const EXACT = {
  'Linha inválida': 'web.imports.rowErrors.invalid',
  'Data inválida: use DD/MM/AAAA ou AAAA-MM-DD': 'web.imports.rowErrors.date',
  'Valor inválido: use o formato -1.234,56': 'web.imports.rowErrors.amount',
  'Valor zero não pode ser importado': 'web.imports.rowErrors.zero',
} as const;

const EMPTY_COLUMN = /^Coluna (data|descrição|valor) vazia$/;

/**
 * A preview row's problem in the person's language. The API sends it as pt-BR text with no code
 * (apps/api/src/modules/imports/csv.ts), so it is recognized by text: first the shared schemas'
 * messages (`VALIDATION_MESSAGES`, via `translateIssue`), then the few literals `mapCsvRow`
 * writes itself. Anything else (a message added to the API later) is shown as it came.
 */
export function translateRowError(t: Translator, message: string): string {
  const resolved = resolveIssue({ message });
  if (resolved) {
    // The shared schema names the column in pt-BR ("Coluna valor ausente"): translate it too.
    const column = resolved.params['column'];
    if (typeof column === 'string' && column in COLUMNS) {
      const translate = t as unknown as (
        key: string,
        params: Record<string, string | number>,
      ) => string;
      return translate(resolved.key, {
        ...resolved.params,
        column: t(COLUMNS[column as keyof typeof COLUMNS]),
      });
    }
    return translateIssue(t, { message });
  }
  const exact = EXACT[message as keyof typeof EXACT];
  if (exact) return t(exact);
  const column = EMPTY_COLUMN.exec(message)?.[1] as keyof typeof COLUMNS | undefined;
  if (column) return t('web.imports.rowErrors.emptyColumn', { column: t(COLUMNS[column]) });
  return message;
}
