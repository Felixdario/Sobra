import type { Transaction } from '@sobra/shared';
import { IdentityMark } from '../components/IdentityMark';
import { useI18n } from '../i18n/i18nContext';
import { accountLabel, amountOf, categoryLabel } from './display';
import styles from './TransactionList.module.css';

type Props = {
  rows: Transaction[];
  onEdit: (tx: Transaction) => void;
  pendingIds: ReadonlySet<string>;
};

/** Below 768px the table becomes the 56px two-line row of DESIGN.md: no horizontal scroll. */
export function TransactionList({ rows, onEdit, pendingIds }: Props) {
  const { t, fmt } = useI18n();
  return (
    <ul className={styles.list}>
      {rows.map((tx) => {
        const amount = amountOf(tx, t, fmt);
        const meta = `${fmt.shortDate(tx.date)} · ${
          tx.type === 'transfer' ? accountLabel(tx) : `${categoryLabel(tx, t)} · ${tx.account.name}`
        }`;
        return (
          <li key={tx.id}>
            <button
              type="button"
              className={styles.row}
              onClick={() => onEdit(tx)}
              disabled={pendingIds.has(tx.id)}
              aria-label={t('web.transactions.list.rowA11y', {
                description: tx.description,
                amount: amount.spoken,
                date: fmt.shortDate(tx.date),
              })}
            >
              <IdentityMark
                color={tx.category?.color ?? null}
                icon={tx.type === 'transfer' ? null : (tx.category?.icon ?? 'sparkles')}
              />
              <span className={styles.text}>
                <span className={styles.title} title={tx.description}>
                  {tx.description}
                </span>
                <span className={styles.meta} title={meta}>
                  {meta}
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
