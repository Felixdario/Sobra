import type { BudgetVsActual } from '@financas/shared';
import { Link } from 'react-router';
import { BudgetMeter } from '../../components/BudgetMeter';
import meterStyles from '../../components/BudgetMeter.module.css';
import { budgetState, type BudgetState } from '../../lib/budget';
import styles from './ChartCard.module.css';

const ORDER: Record<BudgetState, number> = { over: 0, near: 1, ok: 2 };

/** The dashboard shows the budgets that need attention; the full list lives on its own screen. */
export const DASHBOARD_BUDGETS = 6;

/** Overspent first, then near the limit, then the rest; each group by share used. */
export function BudgetChart({ budgets, href }: { budgets: BudgetVsActual; href: string }) {
  const items = [...budgets.items].sort(
    (a, b) => ORDER[budgetState(a)] - ORDER[budgetState(b)] || b.percentUsed - a.percentUsed,
  );
  const shown = items.slice(0, DASHBOARD_BUDGETS);
  const hidden = items.length - shown.length;
  return (
    <>
      <ul className={meterStyles.list}>
        {shown.map((item) => (
          <BudgetMeter
            key={item.categoryId}
            name={item.name}
            color={item.color}
            budgeted={item.budgeted}
            actual={item.actual}
          />
        ))}
      </ul>
      {hidden > 0 ? (
        <p className={styles.more}>
          <Link to={href}>Ver todos os {items.length} orçamentos</Link>
        </p>
      ) : null}
    </>
  );
}
