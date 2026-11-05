import { cents, type Cents, type MonthSummary } from '@sobra/shared';
import { Triangle } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, speakMoney } from '../../lib/money';
import { FIGURE_MAX_FONT_SCALE } from '../../theme/fontScale';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { ICON_STROKE } from '../../ui/icons';
import { useFigureStyle, useFitValue } from '../../ui/useFigureStyle';
import type { Headline } from './summaryModel';

/**
 * The month's answer: one Figure XL, what it means, and the change with its base named. The
 * figure steps down to fit (never cut); KPI rows wrap the value under the label when both don't
 * fit on one line (2× text, billions).
 */
export function HeadlineCard({ headline, summary }: { headline: Headline; summary: MonthSummary }) {
  const theme = useTheme();
  const styles = useStyles();
  const figure =
    headline.tone === 'debt' ? formatMoney(cents(-headline.value)) : formatMoney(headline.value);
  const figureColor =
    headline.tone === 'debt' ? theme.colors.money.debt : theme.colors.text.primary;
  const delta = headline.delta;
  const deltaColor = delta?.good ? theme.colors.money.income : theme.colors.money.debt;
  const fit = useFigureStyle(figure);

  return (
    <View style={styles.card}>
      <View
        onLayout={fit.onLayout}
        accessible
        accessibilityLabel={`${headline.label}: ${speakMoney(headline.tone === 'debt' ? cents(-headline.value) : headline.value)}`}
      >
        <AppText variant="label" tone="secondary">
          {headline.label}
        </AppText>
        <AppText
          variant={fit.variant}
          maxFontSizeMultiplier={fit.maxFontSizeMultiplier}
          allowFontScaling={fit.allowFontScaling}
          style={fit.fitStyle}
          color={figureColor}
          testID="headline-figure"
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
          <AppText variant="caption" color={deltaColor} style={styles.flex}>
            {delta.text}
          </AppText>
        </View>
      ) : null}
      <View style={styles.kpis}>
        <Kpi
          label="Receitas"
          value={summary.income}
          sign="always"
          color={summary.income === 0 ? theme.colors.money.zero : theme.colors.money.income}
        />
        <Kpi
          label="Despesas"
          value={cents(-summary.expense)}
          color={summary.expense === 0 ? theme.colors.money.zero : theme.colors.money.expense}
        />
        <Kpi
          label="Saldo em contas"
          value={summary.balance}
          color={summary.balance < 0 ? theme.colors.money.debt : theme.colors.text.primary}
        />
      </View>
    </View>
  );
}

/** One element for screen readers: "Despesas: menos 263 reais e 16 centavos". */
function Kpi({
  label,
  value,
  sign = 'auto',
  color,
}: {
  label: string;
  value: Cents;
  sign?: 'auto' | 'always';
  color: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const text = formatMoney(value, sign);
  const fit = useFitValue(text, theme.text.titleSm, FIGURE_MAX_FONT_SCALE);
  return (
    <View
      style={styles.kpi}
      onLayout={fit.onLayout}
      accessible
      accessibilityLabel={`${label}: ${speakMoney(value)}`}
    >
      <AppText variant="bodySm" tone="secondary">
        {label}
      </AppText>
      <AppText
        variant="titleSm"
        color={color}
        allowFontScaling={fit.allowFontScaling}
        maxFontSizeMultiplier={FIGURE_MAX_FONT_SCALE}
        style={[styles.kpiValue, fit.fitStyle]}
      >
        {text}
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
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: t.space[3],
    minHeight: t.layout.row,
    paddingVertical: t.space[1],
  },
  kpiValue: { marginLeft: 'auto', fontVariant: ['tabular-nums', 'lining-nums'] },
  flex: { flex: 1 },
}));
