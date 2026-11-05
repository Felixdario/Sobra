import type { IncomeVsExpensePoint } from '@sobra/shared';
import { space } from '@sobra/tokens';
import { scaleBand, scaleLinear } from '@visx/scale';
import { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import styles from './chart.module.css';
import { axisGutter, columnPath, niceTicks } from './geometry';
import { Tooltip } from './Tooltip';
import { useElementWidth } from './useElementWidth';

export const INCOME_EXPENSE_HEIGHT = space[20] * 3;

const BASE_MARGIN = { top: space[2], right: 0, bottom: space[6] };
const MAX_BAR = space[6];
const GAP = space[0.5];

type Props = { points: IncomeVsExpensePoint[]; titleId: string; descId: string };

export function IncomeExpenseChart({ points, titleId, descId }: Props) {
  const { t, fmt } = useI18n();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = INCOME_EXPENSE_HEIGHT;
  const max = Math.max(...points.map((p) => Math.max(p.income, p.expense)), 1);
  const ticks = niceTicks(max, 3);
  const margin = { ...BASE_MARGIN, left: axisGutter(ticks.map(fmt.compactAmount)) };
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const baseY = height - margin.bottom;
  const top = ticks.at(-1) ?? max;
  const x = scaleBand({
    domain: points.map((p) => p.month),
    range: [margin.left, margin.left + innerWidth],
    paddingInner: 0.35,
    paddingOuter: 0.2,
  });
  const y = scaleLinear({ domain: [0, top], range: [baseY, margin.top] });
  const band = x.bandwidth();
  const bar = Math.min(MAX_BAR, (band - GAP) / 2);
  const last = points.length - 1;
  const activePoint = active === null ? null : points[active];

  return (
    <div
      ref={ref}
      className={styles.plot}
      style={{ height }}
      onPointerLeave={() => setActive(null)}
    >
      <svg
        className={styles.svg}
        width={width}
        height={height}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={tick === 0 ? styles.baseline : styles.grid}
              x1={margin.left}
              x2={margin.left + innerWidth}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className={styles.axis}
              x={margin.left - space[2]}
              y={y(tick) + space[1]}
              textAnchor="end"
            >
              {fmt.compactAmount(tick)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const x0 = (x(point.month) ?? 0) + (band - bar * 2 - GAP) / 2;
          const dim = active !== null && active !== index;
          return (
            <g key={point.month} className={dim ? styles.dim : undefined}>
              <path className={styles.income} d={columnPath(x0, y(point.income), bar, baseY)} />
              <path
                className={styles.expense}
                d={columnPath(x0 + bar + GAP, y(point.expense), bar, baseY)}
              />
              <text
                className={`${styles.axis} ${index === last ? styles.axisStrong : ''}`}
                x={(x(point.month) ?? 0) + band / 2}
                y={height - space[1]}
                textAnchor="middle"
              >
                {fmt.monthShort(point.month)}
              </text>
              <rect
                className={styles.hit}
                x={(x(point.month) ?? 0) - (band * 0.35) / 2}
                y={margin.top}
                width={band * 1.35}
                height={baseY - margin.top}
                onPointerEnter={() => setActive(index)}
                onPointerMove={() => setActive(index)}
              />
            </g>
          );
        })}
      </svg>
      {activePoint ? (
        <Tooltip
          title={fmt.monthTitle(activePoint.month)}
          x={(x(activePoint.month) ?? 0) + band}
          width={width}
          rows={[
            {
              key: 'income',
              value: fmt.money(activePoint.income),
              label: t('web.dashboard.charts.incomeExpense.income'),
              color: 'var(--color-chart-income)',
            },
            {
              key: 'expense',
              value: fmt.money(activePoint.expense),
              label: t('web.dashboard.charts.incomeExpense.expense'),
              color: 'var(--color-chart-expense)',
            },
            {
              key: 'net',
              value: fmt.signedMoney(activePoint.net),
              label:
                activePoint.net >= 0
                  ? t('web.dashboard.charts.incomeExpense.left')
                  : t('web.dashboard.charts.incomeExpense.short'),
              color: 'var(--color-chart-main)',
            },
          ]}
        />
      ) : null}
    </div>
  );
}

export function IncomeExpenseLegend() {
  const { t } = useI18n();
  return (
    <ul className={styles.legend}>
      <li>
        <span className={`${styles.key} ${styles.keyIncome}`} aria-hidden="true" />
        {t('web.dashboard.charts.incomeExpense.income')}
      </li>
      <li>
        <span className={`${styles.key} ${styles.keyExpense}`} aria-hidden="true" />
        {t('web.dashboard.charts.incomeExpense.expense')}
      </li>
    </ul>
  );
}

export function IncomeExpenseTable({ points }: { points: IncomeVsExpensePoint[] }) {
  const { t, fmt } = useI18n();
  return (
    <table>
      <caption className="visually-hidden">
        {t('web.dashboard.charts.incomeExpense.caption')}
      </caption>
      <thead>
        <tr>
          <th scope="col">{t('web.dashboard.charts.month')}</th>
          <th scope="col">{t('web.dashboard.charts.incomeExpense.income')}</th>
          <th scope="col">{t('web.dashboard.charts.incomeExpense.expense')}</th>
          <th scope="col">{t('web.dashboard.charts.incomeExpense.net')}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.month}>
            <th scope="row">{fmt.monthTitle(point.month)}</th>
            <td className="num">{fmt.money(point.income)}</td>
            <td className="num">{fmt.money(point.expense)}</td>
            <td className="num">{fmt.signedMoney(point.net)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
