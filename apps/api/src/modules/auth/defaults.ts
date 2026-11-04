import type { AccountType, CategoryKind, IconName } from '@financas/shared';

type DefaultCategory = { name: string; kind: CategoryKind; color: string; icon: IconName };

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Salário', kind: 'income', color: '#16A34A', icon: 'briefcase' },
  { name: 'Freelance', kind: 'income', color: '#0EA5E9', icon: 'circle-dollar' },
  { name: 'Rendimentos', kind: 'income', color: '#14B8A6', icon: 'trending-up' },
  { name: 'Moradia', kind: 'expense', color: '#8B5CF6', icon: 'home' },
  { name: 'Mercado', kind: 'expense', color: '#F97316', icon: 'cart' },
  { name: 'Transporte', kind: 'expense', color: '#3B82F6', icon: 'car' },
  { name: 'Restaurantes', kind: 'expense', color: '#EF4444', icon: 'utensils' },
  { name: 'Lazer', kind: 'expense', color: '#EC4899', icon: 'film' },
  { name: 'Saúde', kind: 'expense', color: '#10B981', icon: 'heart-pulse' },
  { name: 'Educação', kind: 'expense', color: '#6366F1', icon: 'graduation-cap' },
  { name: 'Assinaturas', kind: 'expense', color: '#A855F7', icon: 'wifi' },
  { name: 'Compras', kind: 'expense', color: '#F59E0B', icon: 'shirt' },
  { name: 'Outros', kind: 'expense', color: '#64748B', icon: 'sparkles' },
];

export const DEFAULT_ACCOUNT: { name: string; type: AccountType; color: string; icon: IconName } = {
  name: 'Carteira',
  type: 'cash',
  color: '#0F766E',
  icon: 'wallet',
};
