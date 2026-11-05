import { hitSlopFor } from '@financas/tokens';
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
  testID?: string;
};

/** 36px pill; the hit slop brings the touch target to 44pt. */
export function Chip({
  label,
  onPress,
  selected = false,
  icon,
  accessibilityLabel,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={hitSlopFor(theme.layout.controlHeight)}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
      pressedStyle={styles.pressed}
    >
      {icon}
      <AppText
        variant="label"
        numberOfLines={1}
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
    height: t.layout.controlHeight,
    paddingHorizontal: t.space[3],
    borderRadius: t.radii.full,
    backgroundColor: t.colors.bg.sunken,
    maxWidth: '100%',
  },
  selected: { backgroundColor: t.colors.bg.selection },
  pressed: { backgroundColor: t.colors.action.secondaryHover },
}));
