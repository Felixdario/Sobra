import { cents, type Transaction } from '@sobra/shared';
import { ArrowLeftRight } from 'lucide-react-native';
import { View } from 'react-native';
import type { I18n } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { STACK_FONT_SCALE } from '../../theme/fontScale';
import { makeStyles } from '../../theme/makeStyles';
import { useFontScale, useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { CategoryIcon, ColorSquare, ICON_SIZE, ICON_STROKE } from '../../ui/icons';

/** Income "+R$", expense "−R$" in ink (never red), transfer unsigned and neutral (ADR-015). */
export function amountOf(tx: Transaction, { money }: Pick<I18n, 'money'>) {
  if (tx.type === 'transfer') return { text: money(tx.amount, 'never'), value: tx.amount };
  const value = cents(tx.type === 'income' ? tx.amount : -tx.amount);
  return { text: money(value, 'always'), value };
}

export function titleOf(tx: Transaction): string {
  return tx.type === 'transfer' ? `${tx.account.name} → ${tx.toAccount.name}` : tx.description;
}

function categoryOf(tx: Transaction, i18n: Pick<I18n, 't' | 'category'>): string {
  return tx.category ? i18n.category(tx.category) : i18n.t('categories.uncategorized');
}

/** "Mercado · Nubank", or for a transfer its description. */
export function metaOf(tx: Transaction, i18n: Pick<I18n, 't' | 'category'>): string {
  if (tx.type === 'transfer') {
    return i18n.t('mobile.transactions.transferMeta', { description: tx.description });
  }
  return [categoryOf(tx, i18n), tx.account.name].join(' · ');
}

/**
 * The whole row as one sentence for screen readers, with commas where the screen has "·":
 * "Feira livre, Mercado, Nubank, menos 25 reais e 23 centavos".
 */
export function describeTransaction(tx: Transaction, i18n: I18n): string {
  if (tx.type === 'transfer') {
    return i18n.t('mobile.transactions.transferA11y', {
      description: tx.description,
      from: tx.account.name,
      to: tx.toAccount.name,
      amount: i18n.speakMoney(tx.amount),
    });
  }
  return i18n.t('mobile.transactions.rowA11y', {
    description: tx.description,
    category: categoryOf(tx, i18n),
    account: tx.account.name,
    amount: i18n.speakMoney(amountOf(tx, i18n).value),
  });
}

/**
 * Icon · title and meta · amount. The amount never shrinks; the title takes two lines. From 1.5×
 * system text the row stacks (title, meta, amount), so nothing is squeezed to a few letters.
 */
export function TransactionRow({ tx }: { tx: Transaction }) {
  const theme = useTheme();
  const styles = useStyles();
  const i18n = useI18n();
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
      {metaOf(tx, i18n)}
    </AppText>
  );
  const amount = (
    <AppText variant="label" color={color} style={styles.amount} testID="row-amount">
      {amountOf(tx, i18n).text}
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
