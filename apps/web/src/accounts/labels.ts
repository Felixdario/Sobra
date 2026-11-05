import type { AccountType, IconName } from '@financas/shared';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de crédito',
  cash: 'Dinheiro',
};

export const DEFAULT_ICON: Record<AccountType, IconName> = {
  checking: 'landmark',
  savings: 'piggy-bank',
  credit_card: 'credit-card',
  cash: 'wallet',
};
