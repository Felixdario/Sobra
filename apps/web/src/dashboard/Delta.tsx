import type { ReactNode } from 'react';
import { isGood, trendOf } from './model';
import styles from './Delta.module.css';

type DeltaProps = {
  /** Signed change; its sign picks the triangle. */
  change: number;
  upIsGood: boolean;
  /** Already formatted with sign: "+R$ 519,45", "−2,1 p.p.". */
  value: string;
  /** The base, always named: "vs setembro", "a mais que em setembro". */
  base: ReactNode;
  size?: 'regular' | 'small';
};

/** A change never relies on color: triangle, explicit sign and the named base carry it. */
export function Delta({ change, upIsGood, value, base, size = 'regular' }: DeltaProps) {
  const trend = trendOf(change);
  const good = isGood(trend, upIsGood);
  const classes = [
    styles.delta,
    size === 'small' ? styles.small : '',
    good ? styles.good : '',
    trend === 'down' ? styles.down : '',
  ].join(' ');
  return (
    <span className={classes}>
      {trend === 'flat' ? null : (
        <svg className={styles.tri} viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 1 9 9H1z" />
        </svg>
      )}
      <span className={`${styles.value} num`}>{value}</span>
      <span>{base}</span>
    </span>
  );
}
