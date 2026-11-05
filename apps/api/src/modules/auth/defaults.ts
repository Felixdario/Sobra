import { createTranslator } from '@sobra/i18n';
import type { AccountType, CategoryKind, CategorySystemKey, IconName, Locale } from '@sobra/shared';
import { identityHex } from '@sobra/tokens';

type DefaultCategory = {
  systemKey: CategorySystemKey;
  kind: CategoryKind;
  color: string;
  icon: IconName;
};

/**
 * Colors from the identity palette in @sobra/tokens (`identityColors`, the same one the web
 * color picker shows): 13 categories, 13 distinct colors (ΔE OKLab ≥ 8 between any two; 3:1 on
 * both surfaces). Names come from @sobra/i18n (`categories.default.<systemKey>`).
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { systemKey: 'salary', kind: 'income', color: identityHex('Verde'), icon: 'briefcase' },
  { systemKey: 'freelance', kind: 'income', color: identityHex('Céu'), icon: 'circle-dollar' },
  { systemKey: 'investments', kind: 'income', color: identityHex('Oliva'), icon: 'trending-up' },
  { systemKey: 'housing', kind: 'expense', color: identityHex('Cobalto'), icon: 'home' },
  { systemKey: 'groceries', kind: 'expense', color: identityHex('Laranja'), icon: 'cart' },
  { systemKey: 'transport', kind: 'expense', color: identityHex('Petróleo'), icon: 'car' },
  { systemKey: 'restaurants', kind: 'expense', color: identityHex('Terracota'), icon: 'utensils' },
  { systemKey: 'leisure', kind: 'expense', color: identityHex('Rosa'), icon: 'film' },
  { systemKey: 'health', kind: 'expense', color: identityHex('Lilás'), icon: 'heart-pulse' },
  { systemKey: 'education', kind: 'expense', color: identityHex('Ameixa'), icon: 'graduation-cap' },
  { systemKey: 'subscriptions', kind: 'expense', color: identityHex('Mostarda'), icon: 'wifi' },
  { systemKey: 'shopping', kind: 'expense', color: identityHex('Argila'), icon: 'shirt' },
  { systemKey: 'other', kind: 'expense', color: identityHex('Grafite'), icon: 'sparkles' },
];

/**
 * Default categories with their names in the sign-up language. The stored `name` matters for
 * search, CSV export and uniqueness; clients show the translated name while `systemKey` is set
 * (ADR-035).
 */
export function defaultCategories(locale: Locale) {
  const t = createTranslator(locale);
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    name: t(`categories.default.${category.systemKey}`),
  }));
}

export function defaultAccount(locale: Locale): {
  name: string;
  type: AccountType;
  color: string;
  icon: IconName;
} {
  return {
    name: createTranslator(locale)('accounts.defaultName'),
    type: 'cash',
    color: '#0F766E',
    icon: 'wallet',
  };
}
