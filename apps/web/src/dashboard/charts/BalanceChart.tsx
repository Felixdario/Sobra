import { monthKey, parseLocalDate, type BalanceHistory } from '@sobra/shared';
import { space } from '@sobra/tokens';
import { scaleLinear } from '@visx/scale';
import { useState, type PointerEvent } from 'react';
import type { Format } from '../../i18n/format';
import { useI18n } from '../../i18n/i18nContext';
import styles from './chart.module.css';
import { axisGutter, CAPTION_CHAR, rangeTicks } from './geometry';
import { Tooltip } from './Tooltip';
import { useElementWidth } from './useElementWidth';

export const BALANCE_HEIGHT = space[20] * 3;

const BASE_MARGIN = { top: space[3], bottom: space[6] };
const LABEL_OFFSET = space[3];
const DOT_RADIUS = space[1];

type Point = { date: string; balance: number };

function labelOf(date: string, fmt: Format): string {
  return date.length === 7 ? fmt.monthTitle(monthKey(date)) : fmt.date(parseLocalDate(date));
}

/** One series: no legend box, the title names it. Crosshair snaps to the nearest day. */
export function BalanceChart({
  history,
  titleId,
  descId,
}: {
  history: BalanceHistory;
  titleId: string;
  descId: string;
}) {
  const { t, fmt } = useI18n();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const points: Point[] = history.points;
  const height = BALANCE_HEIGHT;
  const values = points.map((p) => p.balance);
  const ticks = rangeTicks(Math.min(...values), Math.max(...values), 3);
  const last = points.at(-1);
  // The direct label at the line's end is compact past R$ 100 mil (exact value in the tooltip).
  const endLabel = last ? fmt.compactMoney(last.balance) : '';
  const margin = {
    ...BASE_MARGIN,
    left: axisGutter(ticks.map(fmt.compactAmount)),
    right: Math.max(space[16] + space[4], LABEL_OFFSET + endLabel.length * CAPTION_CHAR),
  };
  const right = width - margin.right;
  const baseY = height - margin.bottom;
  const y = scaleLinear({
    domain: [ticks[0] ?? 0, ticks.at(-1) ?? 1],
    range: [baseY, margin.top],
  });
  const x = scaleLinear({
    domain: [0, Math.max(points.length - 1, 1)],
    range: [margin.left, right],
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.balance)}`).join('');
  const monthStarts = points
    .map((p, i) => ({
      i,
      key: p.date.slice(0, 7),
      first: i === 0 || p.date.slice(0, 7) !== points[i - 1]?.date.slice(0, 7),
    }))
    .filter((m) => m.first);
  const roomy = (right - margin.left) / Math.max(monthStarts.length, 1) >= space[12];
  const activePoint = active === null ? null : points[active];

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / Math.max(box.width, 1);
    setActive(Math.round(ratio * (points.length - 1)));
  };

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
              x2={right}
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
        {monthStarts.map((m) => (
          <text
            key={m.key}
            className={styles.axis}
            x={x(m.i)}
            y={height - space[1]}
            textAnchor="start"
          >
            {roomy ? fmt.monthShort(monthKey(m.key)) : fmt.monthShort(monthKey(m.key)).slice(0, 3)}
          </text>
        ))}
        <path className={styles.line} d={path} />
        {last ? (
          <>
            <circle
              className={styles.dot}
              cx={x(points.length - 1)}
              cy={y(last.balance)}
              r={DOT_RADIUS}
            />
            <text
              className={styles.direct}
              x={x(points.length - 1) + LABEL_OFFSET}
              y={y(last.balance) + space[1]}
            >
              {endLabel}
            </text>
          </>
        ) : null}
        {activePoint && active !== null ? (
          <>
            <line
              className={styles.crosshair}
              x1={x(active)}
              x2={x(active)}
              y1={margin.top}
              y2={baseY}
            />
            <circle
              className={styles.dot}
              cx={x(active)}
              cy={y(activePoint.balance)}
              r={DOT_RADIUS}
            />
          </>
        ) : null}
        <rect
          className={styles.hit}
          x={margin.left}
          y={margin.top}
          width={Math.max(right - margin.left, 0)}
          height={Math.max(baseY - margin.top, 0)}
          onPointerMove={onMove}
          onPointerDown={onMove}
        />
      </svg>
      {activePoint && active !== null ? (
        <Tooltip
          title={labelOf(activePoint.date, fmt)}
          x={x(active)}
          width={width}
          rows={[
            {
              key: 'balance',
              value: fmt.money(activePoint.balance),
              label: t('web.dashboard.charts.balance.series'),
              color: 'var(--color-chart-main)',
            },
          ]}
        />
      ) : null}
    </div>
  );
}

/** One row per month (end-of-month balance), so the table stays readable for daily data. */
export function BalanceTable({ history }: { history: BalanceHistory }) {
  const { t, fmt } = useI18n();
  const byMonth = new Map<string, number>();
  for (const point of history.points) byMonth.set(point.date.slice(0, 7), point.balance);
  return (
    <table>
      <caption className="visually-hidden">{t('web.dashboard.charts.balance.caption')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('web.dashboard.charts.month')}</th>
          <th scope="col">{t('web.dashboard.charts.balance.endOfMonth')}</th>
        </tr>
      </thead>
      <tbody>
        {[...byMonth].map(([month, balance]) => (
          <tr key={month}>
            <th scope="row">{fmt.monthTitle(monthKey(month))}</th>
            <td className="num">{fmt.money(balance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
