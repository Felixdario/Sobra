import { categoryName, type Translator } from '@sobra/i18n';
import type { Transaction } from '@sobra/shared';
import type { Format } from '../i18n/format';

export type AmountTone = 'income' | 'expense' | 'transfer';

/** Income "+R$", expense "−R$" (ink, never red), transfer unsigned and neutral (ADR-015). */
export function amountOf(
  tx: Transaction,
  t: Translator,
  fmt: Format,
): { text: string; tone: AmountTone; spoken: string } {
  if (tx.type === 'transfer') {
    return {
      text: fmt.money(tx.amount),
      tone: 'transfer',
      spoken: t('web.transactions.spokenTransfer', { amount: fmt.spokenMoney(tx.amount) }),
    };
  }
  const value = tx.type === 'income' ? tx.amount : -tx.amount;
  return { text: fmt.signedMoney(value), tone: tx.type, spoken: fmt.spokenMoney(value) };
}

/** "Nubank" or, for a transfer, "Nubank → Poupança Caixa". */
export function accountLabel(tx: Transaction): string {
  return tx.type === 'transfer' ? `${tx.account.name} → ${tx.toAccount.name}` : tx.account.name;
}

export function categoryLabel(tx: Transaction, t: Translator): string {
  if (tx.type === 'transfer') return t('transactionTypes.transfer');
  return tx.category ? categoryName(t, tx.category) : t('categories.uncategorized');
}
