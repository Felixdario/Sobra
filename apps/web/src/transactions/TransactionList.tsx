import type { Transaction } from '@financas/shared';
import { IdentityMark } from '../components/IdentityMark';
import { accountLabel, amountOf, categoryLabel, formatShortDate } from './display';
import styles from './TransactionList.module.css';

type Props = {
  rows: Transaction[];
  onEdit: (tx: Transaction) => void;
  pendingIds: ReadonlySet<string>;
};

/** Below 768px the table becomes the 56px two-line row of DESIGN.md: no horizontal scroll. */
export function TransactionList({ rows, onEdit, pendingIds }: Props) {
  return (
    <ul className={styles.list}>
      {rows.map((tx) => {
        const amount = amountOf(tx);
        return (
          <li key={tx.id}>
            <button
              type="button"
              className={styles.row}
              onClick={() => onEdit(tx)}
              disabled={pendingIds.has(tx.id)}
              aria-label={`${tx.description}, ${amount.spoken}, ${formatShortDate(tx.date)}. Editar`}
            >
              <IdentityMark
                color={tx.category?.color ?? null}
                icon={tx.type === 'transfer' ? null : (tx.category?.icon ?? 'sparkles')}
              />
              <span className={styles.text}>
                <span className={styles.title}>{tx.description}</span>
                <span className={styles.meta}>
                  {formatShortDate(tx.date)} ·{' '}
                  {tx.type === 'transfer'
                    ? accountLabel(tx)
                    : `${categoryLabel(tx)} · ${tx.account.name}`}
                </span>
              </span>
              <span className={`${styles.amount} ${styles[amount.tone]} num`}>{amount.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
