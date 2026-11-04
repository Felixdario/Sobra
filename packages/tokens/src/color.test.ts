import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaEOK, hexToRgb, oklch, relativeLuminance, withAlpha } from './color';

describe('fórmula WCAG', () => {
  it('preto sobre branco é 21:1 e uma cor contra ela mesma é 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('confere com valores de referência conhecidos', () => {
    // #767676 on white is the classic "lightest AA grey": 4.54:1.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('é simétrica', () => {
    expect(contrastRatio('#1C50B5', '#F1F1EE')).toBe(contrastRatio('#F1F1EE', '#1C50B5'));
  });
});

describe('OKLab', () => {
  it('branco tem L = 1 e cinza não tem croma', () => {
    expect(oklch('#FFFFFF').l).toBeCloseTo(1, 4);
    expect(oklch('#808080').c).toBeLessThan(0.0001);
  });

  it('ΔE é zero para a mesma cor e cresce com a diferença', () => {
    expect(deltaEOK('#1C50B5', '#1C50B5')).toBe(0);
    expect(deltaEOK('#000000', '#FFFFFF')).toBeCloseTo(100, 0);
    expect(deltaEOK('#1C50B5', '#1D51B6')).toBeLessThan(1);
  });

  it('a simulação de deuteranopia aproxima vermelho e verde', () => {
    const normal = deltaEOK('#D62728', '#2CA02C');
    const deutan = deltaEOK('#D62728', '#2CA02C', 'deutan');
    expect(deutan).toBeLessThan(normal / 2);
  });
});

describe('utilitários', () => {
  it('rejeita cor inválida', () => {
    expect(() => hexToRgb('red')).toThrow();
  });

  it('gera rgba válido para CSS e React Native', () => {
    expect(withAlpha('#0E0E0D', 0.48)).toBe('rgba(14, 14, 13, 0.48)');
  });
});
