import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaEOK } from './color';
import { identityColors, identityHex } from './identity';
import { darkTheme, lightTheme } from './themes';

describe('paleta de identidade (categorias e contas)', () => {
  it('tem 13 cores únicas, distinguíveis duas a duas (ΔE OKLab ≥ 8)', () => {
    const hexes = identityColors.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(13);
    const deltas = hexes.flatMap((a, i) => hexes.slice(i + 1).map((b) => deltaEOK(a, b)));
    expect(Math.min(...deltas)).toBeGreaterThanOrEqual(8);
  });

  it('cada cor lê a 3:1 como objeto gráfico nas superfícies dos dois temas', () => {
    for (const { hex } of identityColors) {
      expect(contrastRatio(hex, lightTheme.colors.bg.surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(hex, darkTheme.colors.bg.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('identityHex resolve pelo nome', () => {
    expect(identityHex('Cobalto')).toBe('#3A64C8');
    expect(identityHex('Petróleo')).toBe('#1F7A80');
  });
});
