import { describe, expect, it } from 'vitest';
import { shadowToCss, toCssStylesheet, toCssVariables } from './css';
import { elevation } from './elevation';
import { darkTheme, lightTheme } from './themes';

describe('toCssVariables', () => {
  it('gera o CSS do tema claro (snapshot)', () => {
    expect(toCssVariables(lightTheme)).toMatchSnapshot();
  });

  it('aceita outro seletor e troca só as cores entre temas', () => {
    const dark = toCssVariables(darkTheme, '.escuro');
    expect(dark.startsWith('.escuro {')).toBe(true);
    expect(dark).toContain('color-scheme: dark;');
    expect(dark).toContain(`--color-bg-canvas: ${darkTheme.colors.bg.canvas};`);
    expect(dark).toContain('--space-4: 16px;');
  });

  it('não tem valores indefinidos nem nomes inválidos', () => {
    const css = toCssVariables(lightTheme);
    expect(css).not.toMatch(/undefined|NaN|\[object/);
    for (const [, name] of css.matchAll(/^\s+(--[^:]+):/gm)) {
      expect(name).toMatch(/^--[a-z0-9-_]+$/);
    }
  });

  it('expõe as cinco séries da paleta de dados', () => {
    const css = toCssVariables(lightTheme);
    for (let i = 1; i <= 5; i++) expect(css).toContain(`--color-chart-series-${i}:`);
    expect(css).not.toContain('--color-chart-series-6:');
  });
});

describe('toCssStylesheet', () => {
  it('gera claro, escuro por preferência do sistema e escuro forçado (snapshot)', () => {
    expect(toCssStylesheet()).toMatchSnapshot();
  });

  it('respeita data-theme="light" mesmo com o sistema escuro', () => {
    const css = toCssStylesheet();
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]');
  });
});

describe('shadowToCss', () => {
  it('superfície plana não tem sombra', () => {
    expect(shadowToCss(elevation.light.flat)).toBe('none');
  });

  it('converte o formato neutro', () => {
    expect(shadowToCss(elevation.light.raised)).toBe('0px 4px 12px -2px rgb(14 14 13 / 0.12)');
  });
});
