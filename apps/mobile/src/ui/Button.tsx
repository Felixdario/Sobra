import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { PressableScale, type PressableScaleProps } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableScaleProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const inactive = disabled || loading;
  const textColor =
    variant === 'primary'
      ? theme.colors.action.onPrimary
      : variant === 'secondary'
        ? theme.colors.action.onSecondary
        : theme.colors.text.link;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={[styles.base, styles[variant], disabled && !loading && styles.disabled, style]}
      pressedStyle={variant === 'primary' ? styles.primaryPressed : styles.secondaryPressed}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText
            variant="label"
            color={disabled ? theme.colors.text.disabled : textColor}
            style={styles.label}
          >
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: t.touchTarget.ios,
    paddingHorizontal: t.space[4],
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: t.colors.action.primary },
  secondary: { backgroundColor: t.colors.action.secondary },
  ghost: { backgroundColor: 'transparent' },
  disabled: { backgroundColor: t.colors.bg.sunken },
  primaryPressed: { backgroundColor: t.colors.action.primaryPressed },
  secondaryPressed: { backgroundColor: t.colors.action.secondaryHover },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  label: { ...t.text.body, fontFamily: t.text.label.fontFamily },
}));
