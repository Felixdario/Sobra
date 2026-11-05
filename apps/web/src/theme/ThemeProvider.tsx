import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  applyThemePreference,
  readThemePreference,
  resolveTheme,
  subscribeToSystemTheme,
  systemTheme,
  type ThemePreference,
} from './theme';
import { ThemeContext } from './themeContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setState] = useState<ThemePreference>(readThemePreference);
  const system = useSyncExternalStore(subscribeToSystemTheme, systemTheme, () => 'light' as const);

  const setPreference = useCallback((next: ThemePreference) => {
    applyThemePreference(next);
    setState(next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved: preference === 'system' ? system : resolveTheme(preference),
      setPreference,
    }),
    [preference, system, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
