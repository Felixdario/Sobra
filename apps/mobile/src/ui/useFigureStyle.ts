import { useState } from 'react';
import type { LayoutChangeEvent, TextStyle } from 'react-native';
import { figureWidthEm, fitFigure, FIGURE_STEPS, type FigureStep } from '../lib/figure';
import type { NativeTextStyle } from '@sobra/tokens';
import { effectiveScale, FIGURE_MAX_FONT_SCALE, MAX_FONT_SCALE } from '../theme/fontScale';
import { useThemeContext } from '../theme/ThemeProvider';

/** A figure below this size stops being a figure; past it, the line is allowed to wrap. */
const MIN_FIGURE_SIZE = 16;

/**
 * Size that makes `text` fit `width` when even the smallest style doesn't (2× text and
 * billions): the computed equivalent of `adjustsFontSizeToFit`, which Android and the web lack.
 * Returns null when the style already fits. The size is final: no `maxFontSizeMultiplier` math.
 */
function shrinkToFit(text: string, width: number, rendered: number, style: NativeTextStyle) {
  const fitted = width / figureWidthEm(text);
  if (fitted >= rendered) return null;
  const fontSize = Math.max(fitted, MIN_FIGURE_SIZE);
  return {
    fontSize,
    lineHeight: Math.ceil((fontSize * style.lineHeight) / style.fontSize),
  } satisfies TextStyle;
}

/**
 * Picks the figure style that fits the measured width (a phone at 2× text, or
 * "R$ 1.000.000.000,00", steps down instead of being cut or broken mid-number). Spread
 * `onLayout` on the figure's container, pass `maxFontSizeMultiplier` and put `fitStyle` last in
 * the text's style. Until the first layout, the width is a phone's content width.
 */
export function useFigureStyle(text: string, steps: readonly FigureStep[] = FIGURE_STEPS) {
  const { theme, fontScale, simulatedScale } = useThemeContext();
  const [width, setWidth] = useState(theme.layout.phoneMargin * 20);
  const base = (step: FigureStep) =>
    // The web simulation already scaled the theme by the style's own cap; undo it first.
    simulatedScale
      ? theme.text[step].fontSize / effectiveScale(fontScale, MAX_FONT_SCALE[step])
      : theme.text[step].fontSize;
  const scale = effectiveScale(fontScale, FIGURE_MAX_FONT_SCALE);
  const size = (step: FigureStep) => base(step) * scale;
  const variant = fitFigure(text, width, size, steps);
  const shrunk = shrinkToFit(text, width, size(variant), theme.text[variant]);
  return {
    variant,
    maxFontSizeMultiplier: FIGURE_MAX_FONT_SCALE,
    // Already in final points: the system must not scale it again.
    fitStyle: shrunk,
    allowFontScaling: shrunk === null,
    onLayout: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
  };
}

/**
 * The same guard for a value that sits in a row (KPIs): the text style's own size, shrunk only
 * when the value alone is wider than the row.
 */
export function useFitValue(text: string, style: NativeTextStyle, maxScale?: number) {
  const { fontScale, simulatedScale } = useThemeContext();
  const [width, setWidth] = useState(0);
  const factor = effectiveScale(fontScale, maxScale);
  // The web simulation scaled the theme fully; a cap below that is applied by AppText.
  const rendered = simulatedScale ? (style.fontSize / fontScale) * factor : style.fontSize * factor;
  const shrunk = width > 0 ? shrinkToFit(text, width, rendered, style) : null;
  return {
    fitStyle: shrunk,
    allowFontScaling: shrunk === null,
    onLayout: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
  };
}
