/**
 * Type: one family, Archivo (Omnibus-Type, SIL OFL), served by Google Fonts on the web and by
 * `@expo-google-fonts/archivo` on mobile. Figures are always tabular and lining.
 */

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

export type FontWeightName = keyof typeof fontWeights;

export const fontFamilies = {
  /** CSS stack for the web. */
  web: '"Archivo", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  /** Google Fonts CSS2 URL with exactly the weights the system uses. */
  webStylesheet: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap',
  /** Family names registered by `useFonts` from `@expo-google-fonts/archivo`. */
  native: {
    regular: 'Archivo_400Regular',
    medium: 'Archivo_500Medium',
    semibold: 'Archivo_600SemiBold',
  },
} as const satisfies {
  web: string;
  webStylesheet: string;
  native: Record<FontWeightName, string>;
};

/** OpenType features for every number that is read as money or a count. */
export const numericFeatures = {
  css: '"tnum" 1, "lnum" 1',
  native: ['tabular-nums', 'lining-nums'] as const,
};

export type TextStyleToken = {
  /** px (web) / pt-dp (native). */
  size: number;
  lineHeight: number;
  /** em, applied as `letter-spacing` on the web and converted to px on native. */
  tracking: number;
  weight: FontWeightName;
  /** True for styles that only ever hold figures. */
  numeric: boolean;
};

/**
 * Fixed scale (no fluid type in product UI), ratio ~1.2 between text steps. Figures get their own
 * three steps so money can be the largest thing on a screen without borrowing a heading.
 */
export const textStyles = {
  figureXl: { size: 48, lineHeight: 52, tracking: -0.03, weight: 'semibold', numeric: true },
  figureLg: { size: 36, lineHeight: 40, tracking: -0.025, weight: 'semibold', numeric: true },
  figureMd: { size: 28, lineHeight: 34, tracking: -0.02, weight: 'semibold', numeric: true },
  headline: { size: 24, lineHeight: 32, tracking: -0.015, weight: 'semibold', numeric: false },
  title: { size: 20, lineHeight: 28, tracking: -0.01, weight: 'semibold', numeric: false },
  titleSm: { size: 17, lineHeight: 24, tracking: -0.005, weight: 'semibold', numeric: false },
  body: { size: 16, lineHeight: 24, tracking: 0, weight: 'regular', numeric: false },
  bodySm: { size: 14, lineHeight: 20, tracking: 0, weight: 'regular', numeric: false },
  label: { size: 13, lineHeight: 18, tracking: 0.005, weight: 'medium', numeric: false },
  caption: { size: 12, lineHeight: 16, tracking: 0.01, weight: 'regular', numeric: false },
} as const satisfies Record<string, TextStyleToken>;

export type TextStyleName = keyof typeof textStyles;
