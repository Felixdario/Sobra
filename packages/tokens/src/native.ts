import { elevation, type ElevationLevel, type ShadowToken } from './elevation';
import { layout, radii, space, touchTarget } from './layout';
import { durations, easings, springs } from './motion';
import { themes, type ThemeColors, type ThemeMode } from './themes';
import { fontFamilies, numericFeatures, textStyles, type TextStyleName } from './typography';

/** Plain-object text style, assignable to React Native's `TextStyle`. */
export type NativeTextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontVariant?: ('tabular-nums' | 'lining-nums')[];
};

/** Plain-object shadow, assignable to React Native's `ViewStyle`. */
export type NativeShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type NativeTheme = {
  mode: ThemeMode;
  dark: boolean;
  colors: ThemeColors;
  space: typeof space;
  radii: typeof radii;
  layout: typeof layout;
  touchTarget: typeof touchTarget;
  text: Record<TextStyleName, NativeTextStyle>;
  shadows: Record<ElevationLevel, NativeShadowStyle>;
  motion: { durations: typeof durations; easings: typeof easings; springs: typeof springs };
};

export function shadowToNative(shadow: ShadowToken): NativeShadowStyle {
  return {
    shadowColor: shadow.color,
    shadowOffset: { width: shadow.offsetX, height: shadow.offsetY },
    shadowOpacity: shadow.opacity,
    // iOS shadowRadius is roughly half of a CSS blur radius.
    shadowRadius: shadow.blur / 2,
    elevation: shadow.androidElevation,
  };
}

function nativeText(): Record<TextStyleName, NativeTextStyle> {
  const entries = Object.entries(textStyles).map(([name, s]) => {
    const style: NativeTextStyle = {
      fontFamily: fontFamilies.native[s.weight],
      fontSize: s.size,
      lineHeight: s.lineHeight,
      letterSpacing: Math.round(s.tracking * s.size * 100) / 100,
    };
    if (s.numeric) style.fontVariant = [...numericFeatures.native];
    return [name, style] as const;
  });
  return Object.fromEntries(entries) as Record<TextStyleName, NativeTextStyle>;
}

/**
 * Theme object for React Native, ready to spread into `StyleSheet.create` values. Pure data: no
 * import from `react-native`, so it is testable in Node and shareable with the web.
 */
export function createNativeTheme(mode: ThemeMode): NativeTheme {
  const shadows = Object.fromEntries(
    Object.entries(elevation[mode]).map(([level, token]) => [level, shadowToNative(token)]),
  ) as Record<ElevationLevel, NativeShadowStyle>;
  return {
    mode,
    dark: mode === 'dark',
    colors: themes[mode].colors,
    space,
    radii,
    layout,
    touchTarget,
    text: nativeText(),
    shadows,
    motion: { durations, easings, springs },
  };
}

/** Text style for a figure: always tabular. Handy for amounts outside the figure* styles. */
export function tabular<T extends object>(
  style: T,
): T & { fontVariant: NativeTextStyle['fontVariant'] } {
  return { ...style, fontVariant: [...numericFeatures.native] };
}
