import type { TextStyleName } from '@sobra/tokens';

/**
 * Advance widths of Archivo SemiBold, in em, by character class. Digits are 0.58em (DESIGN.md:
 * ten "1" or "8" at 40px measure 231px); separators and the space are about half that; letters
 * and signs ("R", "$", "−", "+") are taken at the widest. A 5% margin keeps the estimate on the
 * safe side, so a figure that "fits" never touches the edge.
 */
const EM = { digit: 0.58, narrow: 0.3, wide: 0.66 } as const;
const SAFETY = 1.05;

export function figureWidthEm(text: string): number {
  let width = 0;
  for (const char of text) {
    if (char >= '0' && char <= '9') width += EM.digit;
    else if (char === '.' || char === ',' || char === ' ' || char === ' ') width += EM.narrow;
    else width += EM.wide;
  }
  return width * SAFETY;
}

/** Largest first. The smallest is the floor: below it the figure wraps instead of shrinking. */
export const FIGURE_STEPS = ['figureXl', 'figureLg', 'figureMd', 'headline'] as const;
export type FigureStep = (typeof FIGURE_STEPS)[number] & TextStyleName;

/**
 * The largest figure style in which `text` fits on one line of `width` points, given each
 * style's rendered font size (already multiplied by the text scale). Amounts are never cut
 * (break-ui: "never truncate numbers"): they step down, and past the floor they wrap.
 */
export function fitFigure(
  text: string,
  width: number,
  fontSize: (step: FigureStep) => number,
  steps: readonly FigureStep[] = FIGURE_STEPS,
): FigureStep {
  const em = figureWidthEm(text);
  const smallest = [...steps].sort((a, b) => fontSize(a) - fontSize(b))[0] as FigureStep;
  return steps.find((step) => em * fontSize(step) <= width) ?? smallest;
}
