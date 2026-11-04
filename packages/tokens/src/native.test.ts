import { describe, expect, it } from 'vitest';
import { hitSlopFor, touchTarget } from './layout';
import { createNativeTheme, shadowToNative, tabular } from './native';
import { elevation } from './elevation';
import { textStyles } from './typography';

describe('createNativeTheme', () => {
  it.each(['light', 'dark'] as const)('monta o tema %s com números puros', (mode) => {
    const theme = createNativeTheme(mode);
    expect(theme.dark).toBe(mode === 'dark');
    expect(theme.space[4]).toBe(16);
    expect(theme.radii.lg).toBe(8);
    expect(theme.touchTarget.ios).toBe(44);
    for (const style of Object.values(theme.text)) {
      expect(typeof style.fontSize).toBe('number');
      expect(style.fontFamily).toMatch(/^Archivo_\d00\w+$/);
    }
  });

  it('usa algarismos tabulares nos estilos de valor', () => {
    const { text } = createNativeTheme('light');
    expect(text.figureXl.fontVariant).toEqual(['tabular-nums', 'lining-nums']);
    expect(text.body.fontVariant).toBeUndefined();
    expect(tabular({ fontSize: 16 }).fontVariant).toEqual(['tabular-nums', 'lining-nums']);
  });

  it('converte tracking em em para pixels', () => {
    const { text } = createNativeTheme('light');
    expect(text.figureXl.letterSpacing).toBeCloseTo(textStyles.figureXl.tracking * 48, 2);
    expect(text.body.letterSpacing).toBe(0);
  });

  it('converte sombras para iOS e Android', () => {
    expect(shadowToNative(elevation.light.overlay)).toEqual({
      shadowColor: '#0E0E0D',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    });
    expect(createNativeTheme('dark').shadows.flat.elevation).toBe(0);
  });
});

describe('alvos de toque', () => {
  it('completa o ícone de 20 até 44pt', () => {
    expect(hitSlopFor(20)).toBe(12);
    expect(hitSlopFor(20, touchTarget.android)).toBe(14);
    expect(hitSlopFor(56)).toBe(0);
  });
});
