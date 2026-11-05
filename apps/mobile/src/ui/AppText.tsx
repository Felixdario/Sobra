import type { TextStyleName } from '@financas/tokens';
import { Text, type TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'link';

export type AppTextProps = TextProps & {
  variant?: TextStyleName;
  tone?: Tone;
  /** Overrides `tone` with a semantic color already read from the theme (money, status). */
  color?: string;
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[theme.text[variant], { color: color ?? theme.colors.text[tone] }, style]}
    />
  );
}
