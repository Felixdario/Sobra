import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, type AppTheme } from './ThemeProvider';

type StylesInput = Parameters<typeof StyleSheet.create>[0];

/** Styles that read the theme, created once per theme (light/dark), never per render. */
export function makeStyles<S extends StylesInput>(factory: (theme: AppTheme) => S & StylesInput) {
  const cache = new WeakMap<AppTheme, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const theme = useTheme();
    return useMemo(() => {
      const cached = cache.get(theme);
      if (cached) return cached;
      const created = StyleSheet.create(factory(theme));
      cache.set(theme, created);
      return created;
    }, [theme]);
  };
}
