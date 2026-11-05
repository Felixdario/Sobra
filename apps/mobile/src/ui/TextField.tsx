import { useState, type ComponentRef, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string | undefined;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Labelled input: strong 1px border (3:1), cobalt focus ring, error said next to the field. */
export function TextField({ label, error, style, ref, ...rest }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.text.tertiary}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        style={[styles.input, focused && styles.focused, error ? styles.invalid : null, style]}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.status.danger} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: t.space[1] },
  input: {
    ...t.text.body,
    color: t.colors.text.primary,
    minHeight: t.layout.controlHeightTouch,
    paddingHorizontal: t.space[3],
    borderWidth: 1,
    borderColor: t.colors.border.strong,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.bg.surface,
  },
  focused: {
    borderColor: t.colors.border.focus,
    borderWidth: 2,
    paddingHorizontal: t.space[3] - 1,
  },
  invalid: { borderColor: t.colors.status.danger },
}));
