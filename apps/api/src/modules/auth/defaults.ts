import type { AccountType, CategoryKind, IconName } from '@financas/shared';

type DefaultCategory = { name: string; kind: CategoryKind; color: string; icon: IconName };

/**
 * Colors from the identity palette of the web color picker (apps/web/src/lib/identityColors.ts):
 * 13 categories, 13 distinct colors (ΔE OKLab ≥ 8 between any two; 3:1 on both surfaces).
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Salário', kind: 'income', color: '#2E8B57', icon: 'briefcase' },
  { name: 'Freelance', kind: 'income', color: '#2E8FBF', icon: 'circle-dollar' },
  { name: 'Rendimentos', kind: 'income', color: '#79821D', icon: 'trending-up' },
  { name: 'Moradia', kind: 'expense', color: '#3A64C8', icon: 'home' },
  { name: 'Mercado', kind: 'expense', color: '#D06A1F', icon: 'cart' },
  { name: 'Transporte', kind: 'expense', color: '#1F7A80', icon: 'car' },
  { name: 'Restaurantes', kind: 'expense', color: '#B4532A', icon: 'utensils' },
  { name: 'Lazer', kind: 'expense', color: '#B54076', icon: 'film' },
  { name: 'Saúde', kind: 'expense', color: '#9B6FD0', icon: 'heart-pulse' },
  { name: 'Educação', kind: 'expense', color: '#8A4FA8', icon: 'graduation-cap' },
  { name: 'Assinaturas', kind: 'expense', color: '#B28A00', icon: 'wifi' },
  { name: 'Compras', kind: 'expense', color: '#A0785A', icon: 'shirt' },
  { name: 'Outros', kind: 'expense', color: '#6B6B66', icon: 'sparkles' },
];

export const DEFAULT_ACCOUNT: { name: string; type: AccountType; color: string; icon: IconName } = {
  name: 'Carteira',
  type: 'cash',
  color: '#0F766E',
  icon: 'wallet',
};
