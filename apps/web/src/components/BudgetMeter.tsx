import { Check, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { budgetState, type BudgetState } from '../lib/budget';
import { money, spokenMoney } from '../lib/format';
import styles from './BudgetMeter.module.css';

type BudgetMeterProps = {
  name: string;
  color: string;
  budgeted: number;
  actual: number;
  /** Replaces the "R$ x de R$ y" line (the budgets page puts the inline editor there). */
  values?: ReactNode;
  actions?: ReactNode;
};

function Status({
  budgeted,
  actual,
  state,
}: {
  budgeted: number;
  actual: number;
  state: BudgetState;
}) {
  if (state === 'over') {
    return (
      <p className={`${styles.status} ${styles.danger}`}>
        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="num">{money(actual - budgeted)}</span> acima
      </p>
    );
  }
  if (state === 'near') {
    return (
      <p className={`${styles.status} ${styles.warning}`}>
        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
        Perto do limite · restam <span className="num">{money(budgeted - actual)}</span>
      </p>
    );
  }
  return (
    <p className={styles.status}>
      <Check size={16} strokeWidth={1.75} aria-hidden="true" />
      Restam <span className="num">{money(budgeted - actual)}</span>
    </p>
  );
}

/** DESIGN.md, "Barra de orçamento": track, fill to the spending, hatched excess past a mark. */
export function BudgetMeter({ name, color, budgeted, actual, values, actions }: BudgetMeterProps) {
  const state = budgetState({ actual, budgeted });
  const scale = Math.max(actual, budgeted, 1);
  const within = (Math.min(actual, budgeted) / scale) * 100;
  const excess = state === 'over' ? ((actual - budgeted) / scale) * 100 : 0;
  const share = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
  const spoken = `${spokenMoney(actual)} de ${spokenMoney(budgeted)}, ${share}% do orçamento`;
  return (
    <li className={`${styles.budget} ${styles[state]}`}>
      <div className={styles.head}>
        <span className={styles.name}>
          <span className={styles.square} style={{ background: color }} aria-hidden="true" />
          {name}
        </span>
        {values ?? (
          <span className={`${styles.values} num`}>
            <strong>{money(actual)}</strong> de {money(budgeted)}
          </span>
        )}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={budgeted / 100}
        aria-valuenow={Math.min(actual, budgeted) / 100}
        aria-valuetext={spoken}
      >
        <span className={styles.fill} style={{ width: `${within}%` }} />
        {excess > 0 ? (
          <>
            <span className={styles.excess} style={{ left: `${within}%`, width: `${excess}%` }} />
            <span className={styles.mark} style={{ left: `${within}%` }} />
          </>
        ) : null}
      </div>
      <div className={styles.foot}>
        <Status budgeted={budgeted} actual={actual} state={state} />
        {actions}
      </div>
    </li>
  );
}
