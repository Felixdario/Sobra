import { parseLocalDate, type Transaction } from '@financas/shared';
import { money, signedMoney, spokenMoney } from '../lib/format';

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
});

/** "18 out" (DESIGN.md, Linha de transação). */
export function formatShortDate(date: string): string {
  return shortDate.format(parseLocalDate(date)).replace(' de ', ' ').replace('.', '');
}

export type AmountTone = 'income' | 'expense' | 'transfer';

/** Income "+R$", expense "−R$" (ink, never red), transfer unsigned and neutral (ADR-015). */
export function amountOf(tx: Transaction): { text: string; tone: AmountTone; spoken: string } {
  if (tx.type === 'transfer') {
    return {
      text: money(tx.amount),
      tone: 'transfer',
      spoken: `transferência de ${spokenMoney(tx.amount)}`,
    };
  }
  const value = tx.type === 'income' ? tx.amount : -tx.amount;
  return { text: signedMoney(value), tone: tx.type, spoken: spokenMoney(value) };
}

/** "Nubank" or, for a transfer, "Nubank → Poupança Caixa". */
export function accountLabel(tx: Transaction): string {
  return tx.type === 'transfer' ? `${tx.account.name} → ${tx.toAccount.name}` : tx.account.name;
}

export function categoryLabel(tx: Transaction): string {
  if (tx.type === 'transfer') return 'Transferência';
  return tx.category?.name ?? 'Sem categoria';
}

export const TYPE_LABELS = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
} as const;
