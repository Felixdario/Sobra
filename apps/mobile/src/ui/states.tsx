import { CircleAlert, WifiOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';
import { ICON_SIZE, ICON_STROKE } from './icons';

/** Loading placeholder in the block's final shape. Static (no pulse), so reduce motion is moot. */
export function Skeleton({
  height,
  width = '100%',
  style,
}: {
  height: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return <View style={[styles.skeleton, { height, width }, style]} />;
}

/** In place of a block that failed: what went wrong and the way out. */
export function ErrorLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="alert">
      <CircleAlert
        size={ICON_SIZE.row}
        color={theme.colors.status.danger}
        strokeWidth={ICON_STROKE}
      />
      <AppText variant="bodySm" color={theme.colors.status.danger} style={styles.flex}>
        {message}
      </AppText>
      <Button variant="ghost" label="Tentar de novo" onPress={onRetry} />
    </View>
  );
}

/** The block keeps its frame and teaches the next step. */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <AppText variant="body" tone="secondary">
        {message}
      </AppText>
      {action}
    </View>
  );
}

export function OfflineBanner({ message }: { message: string }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <WifiOff
        size={ICON_SIZE.inline}
        color={theme.colors.text.secondary}
        strokeWidth={ICON_STROKE}
      />
      <AppText variant="caption" tone="secondary">
        {message}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  skeleton: { backgroundColor: t.colors.bg.sunken, borderRadius: t.radii.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.layout.row },
  flex: { flex: 1 },
  empty: { gap: t.space[3], paddingVertical: t.space[2], alignItems: 'flex-start' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    paddingHorizontal: t.layout.phoneMargin,
    paddingVertical: t.space[2],
    backgroundColor: t.colors.bg.sunken,
  },
}));
