import type { ThemeMode } from '@financas/tokens';
import { createContext, use } from 'react';
import type { ThemePreference } from './theme';

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme precisa de <ThemeProvider>');
  return value;
}
