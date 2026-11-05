import { cents } from '@sobra/shared';
import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useI18n } from '../../i18n/I18nProvider';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { HatchPattern, svgId } from '../../ui/Hatch';
import type { Ruler, RulerSegment } from './summaryModel';

const sumBefore = (segments: readonly RulerSegment[], index: number) =>
  segments.slice(0, index).reduce((total, segment) => total + segment.amount, 0);

type Props = { ruler: Ruler; partial: boolean };

/**
 * The month ruler (DESIGN.md signature): the bar is the month's income; spending enters as flat
 * ink planes, darkest for the largest category, 2px apart; what is left is the cobalt plane.
 * Spending past income crosses a marker and turns into hatching: red in a closed month, neutral
 * while the month is partial (no alarm on day 4). Static: it renders at its final value.
 */
export function MonthRuler({ ruler, partial }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const i18n = useI18n();
  const { t } = i18n;
  const [width, setWidth] = useState(0);
  const hatchId = `hatch-${svgId(useId())}`;
  const gap = theme.space[0.5];
  const height = theme.space[6];
  const overColor = partial ? theme.colors.chart.comparison : theme.colors.budget.over;
  const x = (amount: number) => (ruler.scale === 0 ? 0 : (amount / ruler.scale) * width);

  const planes = ruler.segments.map((segment, index) => {
    const start = x(sumBefore(ruler.segments, index));
    return {
      ...segment,
      start,
      end: start + x(segment.amount),
      color: theme.ink[index] ?? theme.colors.chart.other,
    };
  });
  const cursor = planes.at(-1)?.end ?? 0;
  const incomeX = x(ruler.income);
  const sobraLabel =
    ruler.over > 0
      ? t(partial ? 'mobile.summary.ruler.beyond' : 'mobile.summary.ruler.short', {
          amount: i18n.money(ruler.over, 'never'),
        })
      : t('mobile.summary.ruler.left', { amount: i18n.money(ruler.sobra, 'never') });
  const receivedLabel = t('mobile.summary.ruler.received', {
    amount: i18n.money(ruler.income, 'never'),
  });

  const description = [
    `${receivedLabel}.`,
    ...planes.map((plane) =>
      t('mobile.summary.ruler.segment', {
        name: plane.name,
        amount: i18n.money(plane.amount, 'never'),
      }),
    ),
    `${sobraLabel}.`,
  ].join(' ');

  return (
    <View style={styles.wrap}>
      <View
        style={styles.labels}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <AppText variant="caption" tone="secondary">
          {receivedLabel}
        </AppText>
        <AppText
          variant="label"
          color={ruler.over > 0 && !partial ? theme.colors.money.debt : theme.colors.text.primary}
        >
          {sobraLabel}
        </AppText>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('mobile.summary.ruler.a11y', { description })}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.bar, { height }]}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <HatchPattern id={hatchId} color={overColor} background={theme.colors.bg.surface} />
            {planes.map((plane) => (
              <Rect
                key={plane.key}
                x={plane.start}
                width={Math.max(plane.end - plane.start - gap, 0)}
                height={height}
                fill={plane.color}
              />
            ))}
            {ruler.sobra > 0 ? (
              <Rect
                x={cursor}
                width={Math.max(incomeX - cursor, 0)}
                height={height}
                fill={theme.colors.chart.main}
              />
            ) : null}
            {ruler.over > 0 ? (
              <>
                <Rect
                  x={incomeX}
                  width={width - incomeX}
                  height={height}
                  fill={`url(#${hatchId})`}
                />
                <Rect
                  x={incomeX - gap / 2}
                  width={gap}
                  height={height}
                  fill={theme.colors.text.primary}
                />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      {/* The ruler's label already reads every plane; the legend is for the eye. */}
      <View
        style={styles.legend}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {planes.map((plane) => (
          <LegendRow
            key={plane.key}
            color={plane.color}
            name={plane.name}
            amount={i18n.money(cents(-plane.amount))}
          />
        ))}
      </View>
    </View>
  );
}

function LegendRow({ color, name, amount }: { color: string; name: string; amount: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText variant="bodySm" tone="secondary" style={styles.legendName} numberOfLines={2}>
        {name}
      </AppText>
      <AppText variant="bodySm" style={styles.amount}>
        {amount}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: t.space[2] },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: t.space[3],
  },
  bar: { borderRadius: t.radii.sm, overflow: 'hidden', backgroundColor: t.colors.budget.track },
  legend: { gap: t.space[1] },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  swatch: { width: t.space[2], height: t.space[2], borderRadius: t.radii.xs },
  // Names in any script start at the swatch (an Arabic name would align right on its own).
  legendName: { flex: 1, textAlign: 'left' },
  amount: { flexShrink: 0, fontVariant: ['tabular-nums', 'lining-nums'] },
}));
