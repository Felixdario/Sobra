import { cents, type Transaction } from '@financas/shared';
import { ArrowLeftRight } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, speakMoney } from '../../lib/money';
import { STACK_FONT_SCALE } from '../../theme/fontScale';
import { makeStyles } from '../../theme/makeStyles';
import { useFontScale, useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { CategoryIcon, ColorSquare, ICON_SIZE, ICON_STROKE } from '../../ui/icons';

/** Income "+R$", expense "−R$" in ink (never red), transfer unsigned and neutral (ADR-015). */
export function amountOf(tx: Transaction) {
  if (tx.type === 'transfer') return { text: formatMoney(tx.amount, 'never'), value: tx.amount };
  const value = cents(tx.type === 'income' ? tx.amount : -tx.amount);
  return { text: formatMoney(value, 'always'), value };
}

export function titleOf(tx: Transaction): string {
  return tx.type === 'transfer' ? `${tx.account.name} → ${tx.toAccount.name}` : tx.description;
}

/** "Mercado · Nubank", or for a transfer its description. */
export function metaOf(tx: Transaction): string {
  if (tx.type === 'transfer') return `Transferência · ${tx.description}`;
  return [tx.category?.name ?? 'Sem categoria', tx.account.name].join(' · ');
}

/**
 * The whole row as one sentence for screen readers, with commas where the screen has "·":
 * "Feira livre, Mercado, Nubank, menos 25 reais e 23 centavos".
 */
export function describeTransaction(tx: Transaction): string {
  if (tx.type === 'transfer') {
    return `${tx.description}, transferência de ${tx.account.name} para ${tx.toAccount.name}, ${speakMoney(tx.amount)}`;
  }
  const category = tx.category?.name ?? 'Sem categoria';
  return `${tx.description}, ${category}, ${tx.account.name}, ${speakMoney(amountOf(tx).value)}`;
}

/**
 * Icon · title and meta · amount. The amount never shrinks; the title takes two lines. From 1.5×
 * system text the row stacks (title, meta, amount), so nothing is squeezed to a few letters.
 */
export function TransactionRow({ tx }: { tx: Transaction }) {
  const theme = useTheme();
  const styles = useStyles();
  const stacked = useFontScale() >= STACK_FONT_SCALE;
  const color =
    tx.type === 'income'
      ? theme.colors.money.income
      : tx.type === 'expense'
        ? theme.colors.money.expense
        : theme.colors.money.transfer;

  const icon = (
    <View style={styles.icon}>
      {tx.category ? (
        <>
          <ColorSquare color={tx.category.color} />
          <CategoryIcon name={tx.category.icon} />
        </>
      ) : (
        <ArrowLeftRight
          size={ICON_SIZE.row}
          color={theme.colors.text.secondary}
          strokeWidth={ICON_STROKE}
        />
      )}
    </View>
  );
  const title = (
    <AppText variant="label" numberOfLines={stacked ? 3 : 2} style={styles.start}>
      {titleOf(tx)}
    </AppText>
  );
  const meta = (
    <AppText variant="bodySm" tone="tertiary" numberOfLines={stacked ? 2 : 1} style={styles.start}>
      {metaOf(tx)}
    </AppText>
  );
  const amount = (
    <AppText variant="label" color={color} style={styles.amount} testID="row-amount">
      {amountOf(tx).text}
    </AppText>
  );

  if (stacked) {
    return (
      <View style={[styles.row, styles.stacked]} testID={`row-${tx.description}`}>
        <View style={styles.line}>
          {icon}
          <View style={styles.text}>{title}</View>
        </View>
        {meta}
        {amount}
      </View>
    );
  }
  return (
    <View style={styles.row} testID={`row-${tx.description}`}>
      {icon}
      <View style={styles.text}>
        {title}
        {meta}
      </View>
      {amount}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.layout.rowTall,
    paddingHorizontal: t.layout.phoneMargin,
    paddingVertical: t.space[2],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
    backgroundColor: t.colors.bg.surface,
  },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: t.space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  icon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    width: t.space[10],
    flexShrink: 0,
  },
  text: { flex: 1 },
  // Descriptions in Arabic or Hebrew still start where the column starts.
  start: { textAlign: 'left' },
  amount: { flexShrink: 0, fontVariant: ['tabular-nums', 'lining-nums'] },
}));
