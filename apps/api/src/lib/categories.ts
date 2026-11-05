import { type CategorySystemKey, DEFAULT_CATEGORY_KEYS } from '@sobra/shared';

const KEYS: ReadonlySet<string> = new Set(DEFAULT_CATEGORY_KEYS);

/**
 * `Category.systemKey` as the contract type. Only the API writes the column, from the shared
 * list; an unknown value (a key removed in a later version) reads as a renamed category.
 */
export function toSystemKey(value: string | null): CategorySystemKey | null {
  return value !== null && KEYS.has(value) ? (value as CategorySystemKey) : null;
}
