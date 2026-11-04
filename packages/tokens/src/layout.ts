/** Spacing on a 4px grid. Keys are multiples of 4 (`space[4]` = 16px). */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export type SpaceKey = keyof typeof space;

/**
 * Tight, bimodal radii: square-ish surfaces (concrete), 4px data ends, a large radius only where
 * the platform expects one (bottom sheets), and full round for pills and avatars.
 */
export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  sheet: 16,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radii;

/** Web layout breakpoints (min-width, px). */
export const breakpoints = {
  medium: 768,
  expanded: 1024,
  wide: 1440,
} as const;

/** Minimum touch targets. */
export const touchTarget = {
  /** iOS HIG, and the floor for coarse pointers on the web. */
  ios: 44,
  /** Material 3. */
  android: 48,
  /** Minimum gap between two adjacent targets. */
  gap: 8,
} as const;

/** Extra hit area for a visual element smaller than the target (RN `hitSlop`). */
export function hitSlopFor(visualSize: number, target: number = touchTarget.ios): number {
  return Math.max(0, Math.ceil((target - visualSize) / 2));
}

export const layout = {
  /** Web sidebar width. */
  sidebar: 240,
  /** Web canvas gutter (one value, horizontal and vertical). */
  gutter: 16,
  /** Phone side margin. */
  phoneMargin: 16,
  /** Max content width on the web. */
  content: 1280,
  /** Row heights. */
  rowCompact: 36,
  row: 44,
  rowTall: 56,
  controlHeight: 36,
  controlHeightTouch: 44,
} as const;
