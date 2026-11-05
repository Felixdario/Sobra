import type { NativeTextStyle, TextStyleName } from '@financas/tokens';

/*
 * Large text (Dynamic Type / Android font size). On iOS and Android the system scales every Text
 * by `fontScale` on its own; screens only read the scale to change layout (stack a row instead of
 * squeezing it). Figures are capped: Figure XL is already 48px, and at 2× it could not show
 * "R$ 1.000.000.000,00" on a phone at all (Apple caps large titles the same way).
 */

export const FIGURE_MAX_FONT_SCALE = 1.5;

/** Largest multiplier per text style; styles not listed follow the system all the way. */
export const MAX_FONT_SCALE: Partial<Record<TextStyleName, number>> = {
  figureXl: FIGURE_MAX_FONT_SCALE,
  figureLg: FIGURE_MAX_FONT_SCALE,
  figureMd: FIGURE_MAX_FONT_SCALE,
};

/** Tab labels and keypad digits grow less: they are icons with words, in fixed slots. */
export const CONTROL_MAX_FONT_SCALE = 1.3;

/** From this scale on, two-column rows (name · value) stack into one column. */
export const STACK_FONT_SCALE = 1.5;

export function effectiveScale(scale: number, max: number | undefined): number {
  return max === undefined ? scale : Math.min(scale, max);
}

export function scaleTextStyle(
  style: NativeTextStyle,
  scale: number,
  max: number | undefined,
): NativeTextStyle {
  const factor = effectiveScale(scale, max);
  if (factor === 1) return style;
  return { ...style, fontSize: style.fontSize * factor, lineHeight: style.lineHeight * factor };
}

/*
 * Simulated scale for Expo web, where the browser has no fontScale: set only from the dev
 * section of Ajustes, so validation screenshots can show 2× text. Native ignores it.
 */
let simulated = 1;
const listeners = new Set<() => void>();

export const simulatedFontScale = {
  get: () => simulated,
  set(next: number) {
    simulated = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
