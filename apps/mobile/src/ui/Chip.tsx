import { hitSlopFor } from '@sobra/tokens';
import type { ReactNode } from 'react';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  icon?: ReactNode;
  accessibilityLabel?: string;
  /** `radio` inside a group where one option is chosen (filters, account, date). */
  accessibilityRole?: 'button' | 'radio';
  testID?: string;
};

/**
 * 36px pill; the hit slop brings the touch target to 44pt. It grows with large text, and a long
 * label ends in "…" inside the pill (the full name is the accessibility label).
 */
export function Chip({
  label,
  onPress,
  selected = false,
  icon,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={accessibilityRole === 'radio' ? { checked: selected } : { selected }}
      hitSlop={hitSlopFor(theme.layout.controlHeight)}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
      pressedStyle={styles.pressed}
    >
      {icon}
      <AppText
        variant="label"
        numberOfLines={1}
        style={styles.label}
        color={selected ? theme.colors.text.link : theme.colors.text.primary}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    minHeight: t.layout.controlHeight,
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[1],
    borderRadius: t.radii.full,
    backgroundColor: t.colors.bg.sunken,
    maxWidth: '100%',
  },
  label: { flexShrink: 1 },
  selected: { backgroundColor: t.colors.bg.selection },
  pressed: { backgroundColor: t.colors.action.secondaryHover },
}));
