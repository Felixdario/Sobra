import { cents, type BudgetVsActualItem } from '@sobra/shared';
import { Check, TriangleAlert } from 'lucide-react-native';
import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useI18n } from '../../i18n/I18nProvider';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { HatchPattern, svgId } from '../../ui/Hatch';
import { ColorSquare, ICON_SIZE, ICON_STROKE } from '../../ui/icons';
import { budgetStatus, budgetText } from './summaryModel';

/** DESIGN.md `components.budget-track.height`; the tokens package has no size for it. */
const TRACK_HEIGHT = 10;

export function BudgetList({ items }: { items: readonly BudgetVsActualItem[] }) {
  const styles = useStyles();
  const sorted = [...items].sort((a, b) => b.percentUsed - a.percentUsed);
  return (
    <View style={styles.list}>
      {sorted.map((item) => (
        <BudgetRow key={item.categoryId} item={item} />
      ))}
    </View>
  );
}

function BudgetRow({ item }: { item: BudgetVsActualItem }) {
  const theme = useTheme();
  const styles = useStyles();
  const i18n = useI18n();
  const { t } = i18n;
  const status = budgetStatus(item);
  const statusColor =
    status === 'over'
      ? theme.colors.money.debt
      : status === 'near'
        ? theme.colors.status.warning
        : theme.colors.text.secondary;
  const Icon = status === 'ok' ? Check : TriangleAlert;
  const text = budgetText(item, i18n);
  const name = i18n.category(item);
  const spoken = t(
    status === 'over'
      ? 'mobile.summary.budget.a11yOver'
      : status === 'near'
        ? 'mobile.summary.budget.a11yNear'
        : 'mobile.summary.budget.a11yOk',
    {
      name,
      actual: i18n.speakMoney(item.actual),
      budgeted: i18n.speakMoney(item.budgeted),
      amount: i18n.speakMoney(cents(Math.abs(item.remaining))),
    },
  );

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={name}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.min(item.percentUsed, 100)),
        text: spoken,
      }}
    >
      <View style={styles.titleRow}>
        <View style={styles.nameGroup}>
          <ColorSquare color={item.color} />
          <AppText variant="label" style={styles.name} numberOfLines={2}>
            {name}
          </AppText>
        </View>
        <AppText variant="bodySm" tone="secondary" style={styles.figures}>
          {t('mobile.summary.budget.figures', {
            actual: i18n.money(item.actual, 'never'),
            budgeted: i18n.money(item.budgeted, 'never'),
          })}
        </AppText>
      </View>
      <BudgetBar item={item} />
      <View style={styles.statusRow}>
        <Icon size={ICON_SIZE.inline} color={statusColor} strokeWidth={ICON_STROKE} />
        <AppText variant="caption" color={statusColor} style={styles.statusText}>
          {text}
        </AppText>
        <AppText variant="caption" tone="tertiary" style={styles.percent}>
          {i18n.percent(item.percentUsed)}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Track to the budget; the fill up to what was spent. Over budget, the budget part stays cobalt,
 * a mark stands at the limit and the excess is hatched red (shape, not only color).
 */
function BudgetBar({ item }: { item: BudgetVsActualItem }) {
  const theme = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const hatchId = `budget-${svgId(useId())}`;
  const status = budgetStatus(item);
  const scale = Math.max(item.budgeted, item.actual);
  const x = (amount: number) => (scale === 0 ? 0 : (amount / scale) * width);
  const fill = status === 'near' ? theme.colors.budget.near : theme.colors.budget.ok;
  const limitX = x(item.budgeted);
  const gap = theme.space[0.5];

  return (
    <View style={styles.track} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={TRACK_HEIGHT}>
          <HatchPattern
            id={hatchId}
            color={theme.colors.budget.over}
            background={theme.colors.bg.surface}
          />
          {status === 'over' ? (
            <>
              <Rect width={Math.max(limitX - gap, 0)} height={TRACK_HEIGHT} fill={fill} />
              <Rect
                x={limitX - gap / 2}
                width={gap}
                height={TRACK_HEIGHT}
                fill={theme.colors.text.primary}
              />
              <Rect
                x={limitX + gap / 2}
                width={Math.max(width - limitX - gap / 2, 0)}
                height={TRACK_HEIGHT}
                fill={`url(#${hatchId})`}
              />
            </>
          ) : (
            <Rect width={x(Math.max(item.actual, 0))} height={TRACK_HEIGHT} fill={fill} />
          )}
        </Svg>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.space[4] },
  row: { gap: t.space[2] },
  // The name keeps at least half the row; long figures wrap below it instead of squeezing it.
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[2] },
  nameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '45%',
  },
  name: { flex: 1, textAlign: 'left' },
  figures: { marginLeft: 'auto', fontVariant: ['tabular-nums', 'lining-nums'] },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: t.radii.sm,
    overflow: 'hidden',
    backgroundColor: t.colors.budget.track,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  statusText: { flexShrink: 1 },
  percent: { marginLeft: 'auto', fontVariant: ['tabular-nums', 'lining-nums'] },
}));
