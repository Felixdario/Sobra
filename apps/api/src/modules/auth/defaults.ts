import type { AccountType, CategoryKind, IconName } from '@sobra/shared';
import { identityHex } from '@sobra/tokens';

type DefaultCategory = { name: string; kind: CategoryKind; color: string; icon: IconName };

/**
 * Colors from the identity palette in @sobra/tokens (`identityColors`, the same one the web
 * color picker shows): 13 categories, 13 distinct colors (ΔE OKLab ≥ 8 between any two; 3:1 on
 * both surfaces).
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Salário', kind: 'income', color: identityHex('Verde'), icon: 'briefcase' },
  { name: 'Freelance', kind: 'income', color: identityHex('Céu'), icon: 'circle-dollar' },
  { name: 'Rendimentos', kind: 'income', color: identityHex('Oliva'), icon: 'trending-up' },
  { name: 'Moradia', kind: 'expense', color: identityHex('Cobalto'), icon: 'home' },
  { name: 'Mercado', kind: 'expense', color: identityHex('Laranja'), icon: 'cart' },
  { name: 'Transporte', kind: 'expense', color: identityHex('Petróleo'), icon: 'car' },
  { name: 'Restaurantes', kind: 'expense', color: identityHex('Terracota'), icon: 'utensils' },
  { name: 'Lazer', kind: 'expense', color: identityHex('Rosa'), icon: 'film' },
  { name: 'Saúde', kind: 'expense', color: identityHex('Lilás'), icon: 'heart-pulse' },
  { name: 'Educação', kind: 'expense', color: identityHex('Ameixa'), icon: 'graduation-cap' },
  { name: 'Assinaturas', kind: 'expense', color: identityHex('Mostarda'), icon: 'wifi' },
  { name: 'Compras', kind: 'expense', color: identityHex('Argila'), icon: 'shirt' },
  { name: 'Outros', kind: 'expense', color: identityHex('Grafite'), icon: 'sparkles' },
];

export const DEFAULT_ACCOUNT: { name: string; type: AccountType; color: string; icon: IconName } = {
  name: 'Carteira',
  type: 'cash',
  color: '#0F766E',
  icon: 'wallet',
};
