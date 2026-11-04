/**
 * Color math used by the tests, the preview and any client that needs to check a user-picked
 * category color at runtime. Pure functions over `#RRGGBB` strings; no DOM.
 */

export type Rgb = readonly [number, number, number];
export type CvdKind = 'protan' | 'deutan' | 'tritan';

const HEX = /^#[0-9a-f]{6}$/i;

export function hexToRgb(hex: string): Rgb {
  if (!HEX.test(hex)) throw new Error(`Cor inválida: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as Rgb;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function linearRgb(hex: string): Rgb {
  return hexToRgb(hex).map(toLinear) as unknown as Rgb;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** OKLab (Björn Ottosson) from linear sRGB. */
export function oklabFromLinear([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklab(hex: string): Rgb {
  return oklabFromLinear(linearRgb(hex));
}

/** OKLCH lightness and chroma. */
export function oklch(hex: string): { l: number; c: number; h: number } {
  const [l, a, b] = oklab(hex);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l, c: Math.hypot(a, b), h };
}

/**
 * Machado, Oliveira & Fernandes (2009) dichromacy simulation at severity 1.0, applied in linear
 * RGB. Same model the dataviz palette validator is calibrated against.
 */
const MACHADO: Record<CvdKind, readonly (readonly number[])[]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function simulateCvd(hex: string, kind: CvdKind): Rgb {
  const rgb = linearRgb(hex);
  const m = MACHADO[kind];
  return [0, 1, 2].map((row) =>
    clamp01(
      (m[row]?.[0] ?? 0) * rgb[0] + (m[row]?.[1] ?? 0) * rgb[1] + (m[row]?.[2] ?? 0) * rgb[2],
    ),
  ) as unknown as Rgb;
}

/**
 * Euclidean distance in OKLab ×100 ("ΔE OK"). With `kind`, both colors are first passed through
 * the dichromacy simulation.
 */
export function deltaEOK(a: string, b: string, kind?: CvdKind): number {
  const la = kind ? oklabFromLinear(simulateCvd(a, kind)) : oklab(a);
  const lb = kind ? oklabFromLinear(simulateCvd(b, kind)) : oklab(b);
  return 100 * Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

/** `#RRGGBB` + alpha → `rgba(r, g, b, a)`; valid in CSS and in React Native. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c * 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
