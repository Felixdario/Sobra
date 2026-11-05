import { figureWidthEm, fitFigure, type FigureStep } from './figure';

const sizes: Record<FigureStep, number> = {
  figureXl: 48,
  figureLg: 36,
  figureMd: 28,
  headline: 24,
};
const at = (scale: number) => (step: FigureStep) => sizes[step] * Math.min(scale, 1.5);
/** Content width of the summary card on a 390pt phone. */
const PHONE = 326;

describe('fitFigure (o número principal nunca é cortado)', () => {
  it('valores comuns ficam no Figure XL', () => {
    expect(fitFigure('R$ 2.800,00', PHONE, at(1))).toBe('figureXl');
  });

  it('R$ 1.000.000.000,00 e −R$ 999.999.999,99 descem de tamanho até caber', () => {
    const billion = fitFigure('R$ 1.000.000.000,00', PHONE, at(1));
    const debt = fitFigure('−R$ 999.999.999,99', PHONE, at(1));
    expect(billion).not.toBe('figureXl');
    expect(debt).not.toBe('figureXl');
    for (const [text, step] of [
      ['R$ 1.000.000.000,00', billion],
      ['−R$ 999.999.999,99', debt],
    ] as const) {
      expect(figureWidthEm(text) * at(1)(step)).toBeLessThanOrEqual(PHONE);
    }
  });

  it('com texto do sistema a 2× (figuras limitadas a 1,5×) ainda escolhe um tamanho que cabe', () => {
    const step = fitFigure('−R$ 373,06', PHONE, at(2));
    expect(figureWidthEm('−R$ 373,06') * at(2)(step)).toBeLessThanOrEqual(PHONE);
  });

  it('se nada cabe, usa o menor tamanho (e o texto quebra linha em vez de ser cortado)', () => {
    expect(fitFigure('R$ 1.000.000.000,00', 120, at(2))).toBe('headline');
  });

  it('a estimativa nunca subestima os algarismos da Archivo (0,58 em)', () => {
    expect(figureWidthEm('8888888888')).toBeGreaterThanOrEqual(5.8);
  });
});
