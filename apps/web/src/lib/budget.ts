export type BudgetState = 'ok' | 'near' | 'over';

/** DESIGN.md, "Barra de orçamento": < 85% folgado, 85–100% perto do limite, > 100% estourado. */
export function budgetState({
  actual,
  budgeted,
}: {
  actual: number;
  budgeted: number;
}): BudgetState {
  if (actual > budgeted) return 'over';
  return budgeted > 0 && actual / budgeted >= 0.85 ? 'near' : 'ok';
}
