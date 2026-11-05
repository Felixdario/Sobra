import {
  formatDate,
  formatMonth,
  monthKey,
  parseLocalDate,
  type BalanceHistory,
} from '@financas/shared';
import { space } from '@financas/tokens';
import { scaleLinear } from '@visx/scale';
import { useState, type PointerEvent } from 'react';
import { capitalize, compactReais, money } from '../../lib/format';
import styles from './chart.module.css';
import { rangeTicks } from './geometry';
import { Tooltip } from './Tooltip';
import { useElementWidth } from './useElementWidth';

export const BALANCE_HEIGHT = space[20] * 3;

const MARGIN = { top: space[3], right: space[16] + space[4], bottom: space[6], left: space[10] };
const DOT_RADIUS = space[1];

type Point = { date: string; balance: number };

function labelOf(date: string): string {
  return date.length === 7
    ? capitalize(formatMonth(monthKey(date)))
    : formatDate(parseLocalDate(date));
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
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const points: Point[] = history.points;
  const height = BALANCE_HEIGHT;
  const right = width - MARGIN.right;
  const baseY = height - MARGIN.bottom;
  const values = points.map((p) => p.balance);
  const ticks = rangeTicks(Math.min(...values), Math.max(...values), 3);
  const y = scaleLinear({
    domain: [ticks[0] ?? 0, ticks.at(-1) ?? 1],
    range: [baseY, MARGIN.top],
  });
  const x = scaleLinear({
    domain: [0, Math.max(points.length - 1, 1)],
    range: [MARGIN.left, right],
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.balance)}`).join('');
  const monthStarts = points
    .map((p, i) => ({
      i,
      key: p.date.slice(0, 7),
      first: i === 0 || p.date.slice(0, 7) !== points[i - 1]?.date.slice(0, 7),
    }))
    .filter((m) => m.first);
  const roomy = (right - MARGIN.left) / Math.max(monthStarts.length, 1) >= space[12];
  const last = points.at(-1);
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
              x1={MARGIN.left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className={styles.axis}
              x={MARGIN.left - space[2]}
              y={y(tick) + space[1]}
              textAnchor="end"
            >
              {compactReais(tick)}
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
            {roomy
              ? formatMonth(monthKey(m.key), 'short')
              : formatMonth(monthKey(m.key), 'short').slice(0, 3)}
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
              x={x(points.length - 1) + space[3]}
              y={y(last.balance) + space[1]}
            >
              {money(last.balance)}
            </text>
          </>
        ) : null}
        {activePoint && active !== null ? (
          <>
            <line
              className={styles.crosshair}
              x1={x(active)}
              x2={x(active)}
              y1={MARGIN.top}
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
          x={MARGIN.left}
          y={MARGIN.top}
          width={Math.max(right - MARGIN.left, 0)}
          height={Math.max(baseY - MARGIN.top, 0)}
          onPointerMove={onMove}
          onPointerDown={onMove}
        />
      </svg>
      {activePoint && active !== null ? (
        <Tooltip
          title={labelOf(activePoint.date)}
          x={x(active)}
          width={width}
          rows={[
            {
              key: 'balance',
              value: money(activePoint.balance),
              label: 'Saldo total',
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
  const byMonth = new Map<string, number>();
  for (const point of history.points) byMonth.set(point.date.slice(0, 7), point.balance);
  return (
    <table>
      <caption className="visually-hidden">Saldo total no fim de cada mês</caption>
      <thead>
        <tr>
          <th scope="col">Mês</th>
          <th scope="col">Saldo no fim do mês</th>
        </tr>
      </thead>
      <tbody>
        {[...byMonth].map(([month, balance]) => (
          <tr key={month}>
            <th scope="row">{capitalize(formatMonth(monthKey(month)))}</th>
            <td className="num">{money(balance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
