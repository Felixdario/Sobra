import { cents, type MonthSummary } from '@financas/shared';
import { Triangle } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, speakMoney } from '../../lib/money';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { ICON_STROKE } from '../../ui/icons';
import type { Headline } from './summaryModel';

/** Longest figure that fits Figure XL at phone width; longer ones step down to Figure LG. */
const FIGURE_XL_MAX = 12;

/** The month's answer: one Figure XL, what it means, and the change with its base named. */
export function HeadlineCard({ headline, summary }: { headline: Headline; summary: MonthSummary }) {
  const theme = useTheme();
  const styles = useStyles();
  const figure =
    headline.tone === 'debt' ? formatMoney(cents(-headline.value)) : formatMoney(headline.value);
  const figureColor =
    headline.tone === 'debt' ? theme.colors.money.debt : theme.colors.text.primary;
  const delta = headline.delta;
  const deltaColor = delta?.good ? theme.colors.money.income : theme.colors.money.debt;

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`${headline.label}: ${speakMoney(headline.tone === 'debt' ? cents(-headline.value) : headline.value)}`}
      >
        <AppText variant="label" tone="secondary">
          {headline.label}
        </AppText>
        <AppText
          variant={figure.length > FIGURE_XL_MAX ? 'figureLg' : 'figureXl'}
          color={figureColor}
          testID="headline-figure"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {figure}
        </AppText>
      </View>
      <AppText variant="bodySm" tone="secondary">
        {headline.detail}
      </AppText>
      {delta ? (
        <View style={styles.delta}>
          <View style={delta.up ? undefined : styles.down}>
            <Triangle
              size={theme.space[3]}
              color={deltaColor}
              fill={deltaColor}
              strokeWidth={ICON_STROKE}
            />
          </View>
          <AppText variant="caption" color={deltaColor}>
            {delta.text}
          </AppText>
        </View>
      ) : null}
      <View style={styles.kpis}>
        <Kpi
          label="Receitas"
          value={formatMoney(summary.income, 'always')}
          color={theme.colors.money.income}
        />
        <Kpi
          label="Despesas"
          value={formatMoney(cents(-summary.expense))}
          color={theme.colors.money.expense}
        />
        <Kpi
          label="Saldo em contas"
          value={formatMoney(summary.balance)}
          color={summary.balance < 0 ? theme.colors.money.debt : theme.colors.text.primary}
        />
      </View>
    </View>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.kpi}>
      <AppText variant="bodySm" tone="secondary">
        {label}
      </AppText>
      <AppText variant="titleSm" color={color} style={styles.kpiValue}>
        {value}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: t.space[2],
    padding: t.space[4],
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.bg.surface,
  },
  delta: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  down: { transform: [{ rotate: '180deg' }] },
  kpis: {
    marginTop: t.space[2],
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
    paddingTop: t.space[2],
  },
  kpi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: t.layout.row,
  },
  kpiValue: { fontVariant: ['tabular-nums', 'lining-nums'] },
}));
