import { cents, type Transaction } from '@financas/shared';
import { ArrowLeftRight } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, speakMoney } from '../../lib/money';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
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

export function describeTransaction(tx: Transaction): string {
  const amount =
    tx.type === 'transfer'
      ? `transferência de ${speakMoney(tx.amount)}`
      : speakMoney(amountOf(tx).value);
  return `${titleOf(tx)}, ${metaOf(tx)}, ${amount}`;
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const theme = useTheme();
  const styles = useStyles();
  const color =
    tx.type === 'income'
      ? theme.colors.money.income
      : tx.type === 'expense'
        ? theme.colors.money.expense
        : theme.colors.money.transfer;

  return (
    <View style={styles.row} testID={`row-${tx.description}`}>
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
      <View style={styles.text}>
        <AppText variant="label" numberOfLines={1}>
          {titleOf(tx)}
        </AppText>
        <AppText variant="bodySm" tone="tertiary" numberOfLines={1}>
          {metaOf(tx)}
        </AppText>
      </View>
      <AppText variant="label" color={color} style={styles.amount}>
        {amountOf(tx).text}
      </AppText>
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
  icon: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], width: t.space[10] },
  text: { flex: 1 },
  amount: { fontVariant: ['tabular-nums', 'lining-nums'] },
}));
