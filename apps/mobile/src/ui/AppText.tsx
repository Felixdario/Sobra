import type { TextStyleName } from '@financas/tokens';
import { Text, type TextProps } from 'react-native';
import { effectiveScale, MAX_FONT_SCALE } from '../theme/fontScale';
import { useThemeContext } from '../theme/ThemeProvider';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'link';

export type AppTextProps = TextProps & {
  variant?: TextStyleName;
  tone?: Tone;
  /** Overrides `tone` with a semantic color already read from the theme (money, status). */
  color?: string;
};

/**
 * Text in a token style. Large text follows the system scale except where a cap applies
 * (figures, or an explicit `maxFontSizeMultiplier`); the web simulation honors the same caps.
 */
export function AppText({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  maxFontSizeMultiplier,
  ...rest
}: AppTextProps) {
  const { theme, fontScale, simulatedScale } = useThemeContext();
  const max = maxFontSizeMultiplier ?? MAX_FONT_SCALE[variant];
  const base = theme.text[variant];
  // The simulated theme already scaled this style by its own cap; re-apply a stricter one.
  const applied = effectiveScale(fontScale, MAX_FONT_SCALE[variant]);
  const capped =
    simulatedScale && maxFontSizeMultiplier !== undefined
      ? {
          fontSize: (base.fontSize / applied) * effectiveScale(fontScale, maxFontSizeMultiplier),
          lineHeight:
            (base.lineHeight / applied) * effectiveScale(fontScale, maxFontSizeMultiplier),
        }
      : null;
  return (
    <Text
      {...rest}
      {...(max === undefined ? {} : { maxFontSizeMultiplier: max })}
      style={[base, capped, { color: color ?? theme.colors.text[tone] }, style]}
    />
  );
}
