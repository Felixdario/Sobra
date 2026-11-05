import { space } from '@sobra/tokens';
import styles from './chart.module.css';

export type TooltipRow = { key: string; value: string; label: string; color: string };

type TooltipProps = { title: string; rows: TooltipRow[]; x: number; width: number };

const TOOLTIP_WIDTH = space[20] * 2 + space[4];

/** Values lead, labels follow; series keyed by a short line in the series color. */
export function Tooltip({ title, rows, x, width }: TooltipProps) {
  const left = Math.min(Math.max(x + space[3], 0), Math.max(width - TOOLTIP_WIDTH, 0));
  return (
    <div className={styles.tooltip} style={{ left }} role="presentation">
      <span className={styles.tooltipTitle}>{title}</span>
      {rows.map((row) => (
        <span key={row.key} className={styles.tooltipRow}>
          <span className={styles.lineKey} style={{ background: row.color }} />
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </span>
      ))}
    </div>
  );
}
