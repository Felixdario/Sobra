import type { BudgetVsActual } from '@financas/shared';
import { BudgetMeter } from '../../components/BudgetMeter';
import meterStyles from '../../components/BudgetMeter.module.css';
import { budgetState, type BudgetState } from '../../lib/budget';

const ORDER: Record<BudgetState, number> = { over: 0, near: 1, ok: 2 };

/** Overspent first, then near the limit, then the rest; each group by share used. */
export function BudgetChart({ budgets }: { budgets: BudgetVsActual }) {
  const items = [...budgets.items].sort(
    (a, b) => ORDER[budgetState(a)] - ORDER[budgetState(b)] || b.percentUsed - a.percentUsed,
  );
  return (
    <ul className={meterStyles.list}>
      {items.map((item) => (
        <BudgetMeter
          key={item.categoryId}
          name={item.name}
          color={item.color}
          budgeted={item.budgeted}
          actual={item.actual}
        />
      ))}
    </ul>
  );
}
