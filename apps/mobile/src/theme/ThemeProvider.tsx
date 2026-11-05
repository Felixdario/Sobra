import { concreto, createNativeTheme, type NativeTheme, type ThemeMode } from '@financas/tokens';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../lib/storage';

export type ThemePreference = 'system' | ThemeMode;

const PREFERENCE_KEY = 'sobra.theme';

/**
 * Ink steps for the month ruler: categories are flat planes in ink, darkest first (DESIGN.md,
 * "A régua do mês"). The semantic theme has no ramp for this, so it is read from the concreto
 * primitives, five steps that all clear 3:1 on the surface.
 */
const inkSteps: Record<ThemeMode, readonly string[]> = {
  light: [concreto[950], concreto[800], concreto[700], concreto[600], concreto[500]],
  dark: [concreto[50], concreto[200], concreto[300], concreto[400], concreto[500]],
};

export type AppTheme = NativeTheme & { ink: readonly string[] };

const themes: Record<ThemeMode, AppTheme> = {
  light: { ...createNativeTheme('light'), ink: inkSteps.light },
  dark: { ...createNativeTheme('dark'), ink: inkSteps.dark },
};

type ThemeContextValue = {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  useEffect(() => {
    let active = true;
    storage
      .get(PREFERENCE_KEY)
      .then((stored) => {
        if (active && isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const mode: ThemeMode =
      preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      theme: themes[mode],
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        storage.set(PREFERENCE_KEY, next).catch(() => {});
      },
    };
  }, [preference, system]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useThemeContext(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme precisa de <ThemeProvider>');
  return value;
}

export function useTheme(): AppTheme {
  return useThemeContext().theme;
}
