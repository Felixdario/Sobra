import {
  ArrowLeftRight,
  FileUp,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Tags,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { to: '/contas', label: 'Contas', icon: Landmark },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/orcamentos', label: 'Orçamentos', icon: PiggyBank },
  { to: '/importar', label: 'Importar CSV', icon: FileUp },
];
