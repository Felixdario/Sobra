import type { CSSProperties } from 'react';

/**
 * Amounts are never truncated (DESIGN.md): a figure that would not fit its box shrinks instead.
 * The CSS reads `--fit-chars` with container query units:
 * `font-size: min(<token>, calc(100cqi / (var(--fit-chars) * 0.52)))`, where 0.52em is a little
 * more than the average advance of Archivo's tabular figures, "R$", separators and signs.
 */
export function fitChars(text: string): CSSProperties {
  return { '--fit-chars': text.length } as CSSProperties;
}
