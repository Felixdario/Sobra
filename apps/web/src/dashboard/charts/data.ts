import type { SpendingByCategory } from '@sobra/shared';

export const CATEGORY_LIMIT = 7;

type Row = { key: string; name: string; color: string | null; amount: number; percent: number };

/** Largest categories; the tail folds into "Outras" (a value bar never gets a generated hue). */
export function categoryRows(spending: SpendingByCategory): Row[] {
  const sorted = [...spending.items].sort((a, b) => b.amount - a.amount);
  const head = sorted.length > CATEGORY_LIMIT ? sorted.slice(0, CATEGORY_LIMIT - 1) : sorted;
  const rows: Row[] = head.map((item) => ({
    key: item.categoryId,
    name: item.name,
    color: item.color,
    amount: item.amount,
    percent: item.percent,
  }));
  const tail = sorted.slice(head.length);
  if (tail.length > 0) {
    rows.push({
      key: 'outras',
      name: `Outras (${tail.length})`,
      color: null,
      amount: tail.reduce((sum, item) => sum + item.amount, 0),
      percent: tail.reduce((sum, item) => sum + item.percent, 0),
    });
  }
  return rows;
}
