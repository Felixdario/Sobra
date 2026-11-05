import type { Category, CsvImportCommitRow, CsvImportPreview } from '@sobra/shared';

export type RowChoice = { include: boolean; categoryId: string };
export type Choices = Record<number, RowChoice>;

/** Fallback when the API has no suggestion: "Outros" of the right kind, or the first one. */
function fallbackCategory(categories: Category[], kind: 'income' | 'expense'): string {
  const ofKind = categories.filter((c) => c.kind === kind);
  const other =
    ofKind.find((c) => c.systemKey === 'other') ?? ofKind.find((c) => c.name === 'Outros');
  return (other ?? ofKind[0])?.id ?? '';
}

/** Valid rows are in, duplicates are out until the user opts in, invalid rows can't be in. */
export function initialChoices(preview: CsvImportPreview, categories: Category[]): Choices {
  const choices: Choices = {};
  for (const row of preview.rows) {
    choices[row.rowNumber] = {
      include: row.mapped !== null && !row.duplicate,
      categoryId:
        row.suggestedCategoryId ??
        (row.mapped ? fallbackCategory(categories, row.mapped.type) : ''),
    };
  }
  return choices;
}

export function commitRows(preview: CsvImportPreview, choices: Choices) {
  const rows: CsvImportCommitRow[] = [];
  let force = false;
  for (const row of preview.rows) {
    const choice = choices[row.rowNumber];
    if (!row.mapped || !choice?.include || !choice.categoryId) continue;
    if (row.duplicate) force = true;
    rows.push({ ...row.mapped, categoryId: choice.categoryId });
  }
  return { rows, force };
}
