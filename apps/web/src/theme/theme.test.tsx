import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeSwitch } from '../layout/ThemeSwitch';
import { readThemePreference, THEME_STORAGE_KEY } from './theme';
import themeInitScript from '../../public/theme-init.js?raw';
import { ThemeProvider } from './ThemeProvider';
import { buildTokensCss } from './tokensCss';

const renderSwitch = () =>
  render(
    <ThemeProvider>
      <ThemeSwitch />
    </ThemeProvider>,
  );

describe('tema', () => {
  it('segue o sistema por padrão, sem fixar data-theme', () => {
    renderSwitch();

    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('a escolha manual vale na hora e persiste para a próxima carga', async () => {
    renderSwitch();
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readThemePreference()).toBe('dark');
  });

  it('voltar para "Sistema" apaga a escolha guardada', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    document.documentElement.dataset.theme = 'light';
    renderSwitch();
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Sistema' }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('o script anterior à pintura usa a mesma chave e o CSS cobre os dois temas', () => {
    expect(themeInitScript).toContain(`'${THEME_STORAGE_KEY}'`);

    const css = buildTokensCss();
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css).toMatch(/--plane-1: #[0-9A-F]{6};/);
  });
});
