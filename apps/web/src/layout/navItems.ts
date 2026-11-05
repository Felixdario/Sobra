import {
  ArrowLeftRight,
  FileUp,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Tags,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '@sobra/i18n';

export type NavItem = { to: string; label: Extract<MessageKey, `nav.${string}`>; icon: LucideIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/transacoes', label: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/contas', label: 'nav.accounts', icon: Landmark },
  { to: '/categorias', label: 'nav.categories', icon: Tags },
  { to: '/orcamentos', label: 'nav.budgets', icon: PiggyBank },
  { to: '/importar', label: 'nav.import', icon: FileUp },
];
