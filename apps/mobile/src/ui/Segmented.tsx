import { Pressable, View } from 'react-native';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

/** Segmented control on a sunken track. The selection swaps instantly: it is a toggle. */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            style={[styles.segment, selected && styles.selected]}
          >
            <AppText
              variant="label"
              color={selected ? theme.colors.text.primary : theme.colors.text.secondary}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    flexDirection: 'row',
    padding: t.space[0.5],
    borderRadius: t.radii.md,
    backgroundColor: t.colors.bg.sunken,
  },
  segment: {
    flex: 1,
    minHeight: t.touchTarget.ios - t.space[1],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radii.sm,
    paddingHorizontal: t.space[3],
  },
  selected: {
    backgroundColor: t.colors.bg.surface,
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
}));
