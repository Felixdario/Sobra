import type { SpendingByCategory } from '@financas/shared';
import { money, percent } from '../../lib/format';
import styles from './CategoryChart.module.css';
import { categoryRows } from './data';

/**
 * Horizontal bars in one hue with direct labels (DESIGN.md, Gráficos): the category's own color
 * appears only as the 8px identity square beside its name, never on the bar. Length is
 * proportional to the largest category, with no minimum width to disguise small values.
 */
export function CategoryChart({ spending }: { spending: SpendingByCategory }) {
  const rows = categoryRows(spending);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <ol className={styles.list}>
      {rows.map((row) => (
        <li key={row.key} className={styles.row}>
          <span className={styles.name}>
            <span
              className={styles.square}
              style={row.color ? { background: row.color } : undefined}
              aria-hidden="true"
            />
            <span className={styles.nameText}>{row.name}</span>
          </span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.bar} style={{ width: `${(row.amount / max) * 100}%` }} />
          </span>
          <span className={`${styles.value} num`}>
            {money(row.amount)}
            <span className={styles.share}>{percent(row.percent)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
