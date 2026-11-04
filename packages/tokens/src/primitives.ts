/**
 * Primitive color ramps. Components never read these directly: they read the semantic theme in
 * `themes.ts`. Names come from the product's world (see DESIGN.md): concrete for the neutrals,
 * Athos Bulcão's cobalt tile for the one data/action hue.
 */

/** Concreto: a neutral with a hair of warmth (OKLCH chroma under 0.01). Never cream. */
export const concreto = {
  0: '#FFFFFF',
  25: '#F8F8F6',
  50: '#F1F1EE',
  100: '#E9E9E5',
  150: '#E1E1DC',
  200: '#D4D4CE',
  300: '#B9B9B2',
  400: '#9A9A93',
  500: '#7B7B74',
  600: '#5E5E58',
  700: '#474743',
  800: '#31312E',
  850: '#262624',
  900: '#1C1C1A',
  950: '#141413',
  1000: '#0E0E0D',
} as const;

/** Cobalto: the one hue of the system (main data element, links, focus, selection). */
export const cobalto = {
  50: '#EEF2FC',
  100: '#DCE5FA',
  300: '#93B1FF',
  400: '#6A92F0',
  500: '#366BD3',
  600: '#1C50B5',
  700: '#173F8E',
  900: '#14213F',
} as const;

/** Verde: income and "sobrou". Deep enough for AAA on the light canvas. */
export const verde = {
  100: '#E3F1E7',
  300: '#7BD69A',
  600: '#075027',
  900: '#13301E',
} as const;

/** Vermelho: debt, overspent budgets, destructive actions. Never on ordinary spending. */
export const vermelho = {
  100: '#FBE6E3',
  300: '#FF9A8C',
  400: '#FF7A6B',
  500: '#C8372B',
  600: '#8A1B14',
  900: '#3D1714',
} as const;

/** Ocre: "perto do limite" and other warnings. */
export const ocre = {
  100: '#FBF0DA',
  300: '#E8C547',
  500: '#B17000',
  700: '#7A4A00',
  900: '#3A2A0C',
} as const;

/**
 * Categorical data hues, one row per mode. Order is part of the contract (CVD separation is
 * validated on adjacent slots): cobalto, ocre, céu, rosa, oliva. Validated with the dataviz
 * skill's validator and re-checked in `data.test.ts`.
 */
export const dataHues = {
  light: ['#1C50B5', '#B17000', '#32A0C5', '#A43068', '#79821D'],
  dark: ['#366BD3', '#C8800D', '#32A0C5', '#B54076', '#848E2D'],
} as const;
