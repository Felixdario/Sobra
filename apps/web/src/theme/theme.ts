import type { ThemeMode } from '@sobra/tokens';

/** Must match `public/theme-init.js`, which applies the choice before the first paint. */
export const THEME_STORAGE_KEY = 'sobra.theme';

export type ThemePreference = 'system' | ThemeMode;

const DARK_QUERY = '(prefers-color-scheme: dark)';

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = safeStorage()?.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function systemTheme(): ThemeMode {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? systemTheme() : preference;
}

/**
 * Persists the choice and pins (or unpins) `data-theme` on <html>. Transitions are suspended for
 * one frame so hover/press color transitions don't play across the whole page on a theme switch.
 */
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  try {
    if (preference === 'system') safeStorage()?.removeItem(THEME_STORAGE_KEY);
    else safeStorage()?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  root.dataset.themeSwitching = '';
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;
  requestAnimationFrame(() => delete root.dataset.themeSwitching);
}

export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
