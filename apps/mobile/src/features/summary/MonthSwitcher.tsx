import { nextMonth, previousMonth, type MonthKey } from '@sobra/shared';
import { hitSlopFor } from '@sobra/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { monthProgress } from '../../lib/month';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { ICON_SIZE, ICON_STROKE } from '../../ui/icons';
import { PressableScale } from '../../ui/PressableScale';

type Props = { month: MonthKey; latest: MonthKey; onChange: (month: MonthKey) => void };

export function MonthSwitcher({ month, latest, onChange }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, monthTitle, progressLabel } = useI18n();
  const atLatest = month >= latest;
  const previous = previousMonth(month);
  const next = nextMonth(month);
  return (
    <View style={styles.row}>
      <Arrow
        label={t('mobile.month.previous', { month: monthTitle(previous) })}
        onPress={() => onChange(previous)}
        icon={
          <ChevronLeft
            size={ICON_SIZE.row}
            color={theme.colors.text.primary}
            strokeWidth={ICON_STROKE}
          />
        }
      />
      <View style={styles.title}>
        <AppText variant="titleSm" accessibilityRole="header" style={styles.center}>
          {monthTitle(month)}
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.center}>
          {progressLabel(monthProgress(month))}
        </AppText>
      </View>
      <Arrow
        label={t('mobile.month.next', { month: monthTitle(next) })}
        disabled={atLatest}
        onPress={() => onChange(next)}
        icon={
          <ChevronRight
            size={ICON_SIZE.row}
            color={atLatest ? theme.colors.text.disabled : theme.colors.text.primary}
            strokeWidth={ICON_STROKE}
          />
        }
      />
    </View>
  );
}

function Arrow({
  label,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={hitSlopFor(theme.touchTarget.ios, theme.touchTarget.android)}
      onPress={onPress}
      style={styles.arrow}
      pressedStyle={styles.arrowPressed}
    >
      {icon}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  title: { flex: 1, alignItems: 'center' },
  center: { textAlign: 'center' },
  arrow: {
    width: t.touchTarget.ios,
    height: t.touchTarget.ios,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPressed: { backgroundColor: t.colors.bg.sunken },
}));
