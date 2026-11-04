import { describe, expect, it } from 'vitest';
import { deltaEOK, oklch, type CvdKind } from './color';
import { dataHues } from './primitives';
import { themes, type ThemeMode } from './themes';

/**
 * Thresholds from the dataviz method (OKLab ΔE ×100, Machado 2009 at severity 1.0):
 * adjacent pairs ≥ 8 under protan/deutan, ≥ 15 under normal vision; the first three slots must
 * also pass all-pairs (they can sit next to each other in any order in a legend or scatter).
 */
const CVD_MIN = 8;
const NORMAL_MIN = 15;
const BAND: Record<ThemeMode, [number, number]> = { light: [0.43, 0.77], dark: [0.48, 0.67] };
const DICHROMACY: CvdKind[] = ['protan', 'deutan'];

const adjacent = (list: readonly string[]) =>
  list.slice(0, -1).map((c, i) => [c, list[i + 1] as string] as const);
const allPairs = (list: readonly string[]) =>
  list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b] as const));

describe.each(['light', 'dark'] as ThemeMode[])('paleta de dados — tema %s', (mode) => {
  const series = themes[mode].colors.chart.series;

  it('é a mesma sequência de matizes documentada', () => {
    expect(series).toEqual(dataHues[mode]);
    expect(themes[mode].colors.chart.main).toBe(series[0]);
  });

  it('fica na faixa de luminosidade e acima do piso de croma', () => {
    const [lo, hi] = BAND[mode];
    for (const hex of series) {
      const { l, c } = oklch(hex);
      expect(l, `${hex} L=${l.toFixed(3)}`).toBeGreaterThanOrEqual(lo);
      expect(l, `${hex} L=${l.toFixed(3)}`).toBeLessThanOrEqual(hi);
      expect(c, `${hex} C=${c.toFixed(3)}`).toBeGreaterThanOrEqual(0.1);
    }
  });

  it.each(adjacent(series))(
    'vizinhas %s × %s se distinguem (visão normal e daltonismo)',
    (a, b) => {
      expect(deltaEOK(a, b), 'normal').toBeGreaterThanOrEqual(NORMAL_MIN);
      for (const kind of DICHROMACY) {
        expect(deltaEOK(a, b, kind), kind).toBeGreaterThanOrEqual(CVD_MIN);
      }
    },
  );

  it('as três primeiras se distinguem duas a duas', () => {
    for (const [a, b] of allPairs(series.slice(0, 3))) {
      expect(deltaEOK(a, b), `${a}×${b} normal`).toBeGreaterThanOrEqual(NORMAL_MIN);
      for (const kind of DICHROMACY) {
        expect(deltaEOK(a, b, kind), `${a}×${b} ${kind}`).toBeGreaterThanOrEqual(CVD_MIN);
      }
    }
  });

  it('"Outros" não se confunde com nenhuma série, nem com daltonismo', () => {
    const { other } = themes[mode].colors.chart;
    for (const hex of series) {
      expect(deltaEOK(hex, other), `${hex} normal`).toBeGreaterThanOrEqual(NORMAL_MIN);
      for (const kind of DICHROMACY) {
        expect(deltaEOK(hex, other, kind), `${hex} ${kind}`).toBeGreaterThanOrEqual(CVD_MIN);
      }
    }
  });

  it('a comparação (período anterior, tracejada) se distingue da série principal', () => {
    const { main, comparison } = themes[mode].colors.chart;
    expect(deltaEOK(main, comparison)).toBeGreaterThanOrEqual(NORMAL_MIN);
    for (const kind of DICHROMACY) {
      expect(deltaEOK(main, comparison, kind)).toBeGreaterThanOrEqual(CVD_MIN);
    }
  });
});

describe('estados de orçamento', () => {
  it.each(['light', 'dark'] as ThemeMode[])(
    'folgado, perto e estourado se distinguem no tema %s mesmo com daltonismo',
    (mode) => {
      const { ok, near, over } = themes[mode].colors.budget;
      for (const [a, b] of allPairs([ok, near, over])) {
        expect(deltaEOK(a, b), `${a}×${b} normal`).toBeGreaterThanOrEqual(NORMAL_MIN);
        for (const kind of DICHROMACY) {
          // The overspent part is also hatched and labelled; colour is never the only signal.
          expect(deltaEOK(a, b, kind), `${a}×${b} ${kind}`).toBeGreaterThanOrEqual(6);
        }
      }
    },
  );
});
