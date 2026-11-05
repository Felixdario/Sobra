import { radii } from '@financas/tokens';

/**
 * A bar with 4px rounded data end and a square base (dataviz mark spec). Vertical bars grow up
 * from `baseY`; horizontal ones grow right from `x`.
 */
export function columnPath(
  x: number,
  y: number,
  width: number,
  baseY: number,
  radius: number = radii.sm,
): string {
  const height = baseY - y;
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return `M${x},${baseY}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${baseY}Z`;
}

/** Round, readable ticks: 3–4 lines from zero (or the minimum) to the top of the scale. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(value);
  if ((ticks.at(-1) ?? 0) < max) ticks.push((ticks.at(-1) ?? 0) + step);
  return ticks;
}

/** Ticks for a range that may not include zero (a balance line). */
export function rangeTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min];
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step / 2; value += step) ticks.push(value);
  if ((ticks.at(-1) ?? 0) < max) ticks.push((ticks.at(-1) ?? 0) + step);
  return ticks;
}
