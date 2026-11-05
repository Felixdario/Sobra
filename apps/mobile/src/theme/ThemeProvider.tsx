import {
  concreto,
  createNativeTheme,
  type NativeTheme,
  type TextStyleName,
  type ThemeMode,
} from '@sobra/tokens';
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { storage } from '../lib/storage';
import { MAX_FONT_SCALE, scaleTextStyle, simulatedFontScale } from './fontScale';

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

/** Web only: the theme's text grows with the simulated scale (native Text scales itself). */
const scaledThemes = new Map<string, AppTheme>();
function withTextScale(mode: ThemeMode, scale: number): AppTheme {
  if (scale === 1) return themes[mode];
  const key = `${mode}:${scale}`;
  const cached = scaledThemes.get(key);
  if (cached) return cached;
  const base = themes[mode];
  const text = Object.fromEntries(
    Object.entries(base.text).map(([name, style]) => [
      name,
      scaleTextStyle(style, scale, MAX_FONT_SCALE[name as TextStyleName]),
    ]),
  ) as AppTheme['text'];
  const theme = { ...base, text };
  scaledThemes.set(key, theme);
  return theme;
}

type ThemeContextValue = {
  theme: AppTheme;
  /** The system text size multiplier (simulated on web in development). */
  fontScale: number;
  /** True when the theme's text was scaled here (web simulation), not by the system. */
  simulatedScale: boolean;
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
  fontScale: fontScaleOverride,
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
  /** Tests: render as if the system text size were this multiplier. */
  fontScale?: number;
}) {
  const system = useColorScheme();
  const window = useWindowDimensions();
  const simulated = useSyncExternalStore(
    simulatedFontScale.subscribe,
    simulatedFontScale.get,
    simulatedFontScale.get,
  );
  const simulatedScale =
    Platform.OS === 'web' && fontScaleOverride === undefined && simulated !== 1;
  const fontScale =
    fontScaleOverride ?? (Platform.OS === 'web' ? simulated : (window.fontScale ?? 1));
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
      theme: simulatedScale ? withTextScale(mode, fontScale) : themes[mode],
      fontScale,
      simulatedScale,
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        storage.set(PREFERENCE_KEY, next).catch(() => {});
      },
    };
  }, [preference, system, fontScale, simulatedScale]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useThemeContext(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme needs <ThemeProvider>');
  return value;
}

export function useTheme(): AppTheme {
  return useThemeContext().theme;
}

export function useFontScale(): number {
  return useThemeContext().fontScale;
}
