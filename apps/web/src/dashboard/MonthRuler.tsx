import type { Translator } from '@sobra/i18n';
import type { Format } from '../i18n/format';
import { useI18n } from '../i18n/i18nContext';
import type { Ruler } from './model';
import styles from './MonthRuler.module.css';

type MonthRulerProps = { ruler: Ruler; monthLabel: string; partial: boolean };

const pct = (value: number, scale: number) => `${((value / scale) * 100).toFixed(3)}%`;

function describe({ ruler, monthLabel }: MonthRulerProps, t: Translator, fmt: Format): string {
  const planes = ruler.planes
    .map((plane) =>
      t('web.dashboard.ruler.plane', { name: plane.name, amount: fmt.spokenMoney(plane.amount) }),
    )
    .join(', ');
  const result =
    ruler.left >= 0
      ? t('web.dashboard.ruler.left', { amount: fmt.spokenMoney(ruler.left) })
      : t('web.dashboard.ruler.short', { amount: fmt.spokenMoney(-ruler.left) });
  return t('web.dashboard.ruler.a11y', {
    month: monthLabel,
    income: fmt.spokenMoney(ruler.income),
    planes,
    result,
  });
}

/**
 * The signature (DESIGN.md, "A régua do mês"): the bar is the month's income; expenses are flat
 * ink planes, largest first; what is left is the cobalt plane. Spending past the income runs
 * beyond the income mark, hatched (red when the month is closed). Nothing animates on load.
 */
export function MonthRuler(props: MonthRulerProps) {
  const { ruler, partial } = props;
  const { t, fmt } = useI18n();
  const { scale, planes, income, left } = ruler;
  if (scale <= 0) return null;
  const spent = planes.reduce((sum, plane) => sum + plane.amount, 0);
  const over = left < 0;
  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="img" aria-label={describe(props, t, fmt)}>
        {planes.map((plane, index) => {
          return (
            <span
              key={plane.key}
              className={styles.plane}
              style={{
                left: pct(plane.start, scale),
                width: pct(plane.amount, scale),
                background: `var(--plane-${index + 1})`,
              }}
            />
          );
        })}
        {left > 0 ? (
          <span
            className={`${styles.plane} ${styles.sobra}`}
            style={{ left: pct(spent, scale), width: pct(left, scale) }}
          />
        ) : null}
        {over ? (
          <>
            <span
              className={`${styles.over} ${partial ? styles.overPartial : ''}`}
              style={{ left: pct(income, scale), width: pct(-left, scale) }}
            />
            <span className={styles.mark} style={{ left: pct(income, scale) }} />
          </>
        ) : null}
      </div>
      <div className={styles.scale}>
        <span className="num">{fmt.money(0)}</span>
        {over ? (
          <span
            className={`${styles.result} ${partial ? styles.resultPartial : styles.resultOver} num`}
          >
            {partial
              ? t('web.dashboard.ruler.overPartial', { amount: fmt.money(-left) })
              : t('web.dashboard.ruler.overClosed', { amount: fmt.money(-left) })}
          </span>
        ) : (
          <span className={`${styles.result} num`}>
            {t('web.dashboard.ruler.leftLabel', { amount: fmt.money(left) })}
          </span>
        )}
        <span className="num">{fmt.money(scale)}</span>
      </div>
      <ul className={styles.legend}>
        {planes.map((plane, index) => (
          <li key={plane.key}>
            <span
              className={styles.chip}
              style={{ background: `var(--plane-${index + 1})` }}
              aria-hidden="true"
            />
            <span className={styles.legendName} title={plane.name}>
              {plane.name}
            </span>
            <span className={`${styles.legendValue} num`}>{fmt.money(plane.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
