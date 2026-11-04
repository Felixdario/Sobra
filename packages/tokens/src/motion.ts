/**
 * Motion conveys state, never decoration. Product UI stays in the 120–320 ms band; nothing
 * performs an entrance on load. Every token has a reduced-motion fallback: crossfade or cut.
 */

/** Durations in ms. */
export const durations = {
  instant: 0,
  fast: 120,
  base: 180,
  moderate: 240,
  slow: 320,
} as const;

export type CubicBezier = readonly [number, number, number, number];

export const easings = {
  /** State changes that start and end on screen (toggle, tab indicator, bar width). */
  standard: [0.2, 0, 0, 1],
  /** Things arriving: menus, toasts, a new row. Strong ease-out. */
  enter: [0.16, 1, 0.3, 1],
  /** Things leaving: faster, accelerating out. */
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, CubicBezier>;

export type EasingName = keyof typeof easings;

export function cubicBezierCss([x1, y1, x2, y2]: CubicBezier): string {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

/**
 * Spring configs in Reanimated's `withSpring` shape (physics-based: damping/stiffness/mass).
 * Used for gestures that hand off velocity (swipe on a transaction row, sheet drag).
 */
export type SpringToken = { damping: number; stiffness: number; mass: number };

export const springs = {
  /** Press feedback, toggles, segmented control thumb. No visible overshoot. */
  snappy: { damping: 30, stiffness: 420, mass: 1 },
  /** Swipe-row release and snap back: follows the finger's velocity, settles fast. */
  swipe: { damping: 26, stiffness: 300, mass: 1 },
  /** Bottom sheet settle: a hint of overshoot, like the platform's own sheets. */
  sheet: { damping: 22, stiffness: 220, mass: 1 },
} as const satisfies Record<string, SpringToken>;

export type SpringName = keyof typeof springs;
