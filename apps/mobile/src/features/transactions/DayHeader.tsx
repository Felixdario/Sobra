import type { Cents } from '@sobra/shared';
import { View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';

/** "Hoje" … "−R$ 45,90" / "Today" … "−$45.90": the day's net (transfers don't count), signed like every value. */
export function DayHeader({ label, total }: { label: string; total: Cents }) {
  const theme = useTheme();
  const styles = useStyles();
  const i18n = useI18n();
  const color =
    total > 0
      ? theme.colors.money.income
      : total < 0
        ? theme.colors.money.expense
        : theme.colors.money.zero;
  return (
    <View
      style={styles.header}
      accessible
      accessibilityRole="header"
      accessibilityLabel={i18n.t('mobile.transactions.dayA11y', {
        day: label,
        amount: i18n.speakMoney(total),
      })}
    >
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <AppText variant="label" color={color} style={styles.total} testID={`day-total-${label}`}>
        {i18n.money(total, 'always')}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: t.space[3],
    minHeight: t.layout.rowCompact,
    paddingHorizontal: t.layout.phoneMargin,
    paddingTop: t.space[2],
    backgroundColor: t.colors.bg.canvas,
  },
  total: { fontVariant: ['tabular-nums', 'lining-nums'] },
}));
