import type {
  Category,
  CategoryCreate,
  CategoryKind,
  CategoryUpdate,
  IconName,
} from '@sobra/shared';
import { type Db, isUniqueViolation } from '../../lib/db';
import { conflict, notFound } from '../../lib/errors';
import { compact } from '../../lib/objects';
import type { Category as CategoryRow } from '../../generated/prisma/client';

const CATEGORY_NOT_FOUND = 'Categoria não encontrada';
const KIND_LABEL: Record<CategoryKind, string> = { income: 'receita', expense: 'despesa' };

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  color: row.color,
  icon: row.icon as IconName,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** Loads a category of `userId`; another user's category is reported as missing (404). */
export async function findOwnedCategory(db: Db, userId: string, id: string): Promise<CategoryRow> {
  const category = await db.category.findFirst({ where: { id, userId } });
  if (!category) throw notFound(CATEGORY_NOT_FOUND);
  return category;
}

async function rethrowDuplicate<T>(kind: CategoryKind, write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`Já existe uma categoria de ${KIND_LABEL[kind]} com esse nome`);
    }
    throw error;
  }
}

export async function listCategories(
  db: Db,
  userId: string,
  { kind }: { kind?: CategoryKind | undefined },
): Promise<Category[]> {
  const rows = await db.category.findMany({
    where: { userId, ...(kind && { kind }) },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toCategory);
}

export async function getCategory(db: Db, userId: string, id: string): Promise<Category> {
  return toCategory(await findOwnedCategory(db, userId, id));
}

export async function createCategory(
  db: Db,
  userId: string,
  input: CategoryCreate,
): Promise<Category> {
  const row = await rethrowDuplicate(
    input.kind,
    db.category.create({ data: { ...input, userId } }),
  );
  return toCategory(row);
}

export async function updateCategory(
  db: Db,
  userId: string,
  id: string,
  input: CategoryUpdate,
): Promise<Category> {
  const current = await findOwnedCategory(db, userId, id);
  const row = await rethrowDuplicate(
    current.kind,
    db.category.update({ where: { id }, data: compact(input) }),
  );
  return toCategory(row);
}

export async function deleteCategory(db: Db, userId: string, id: string): Promise<void> {
  await findOwnedCategory(db, userId, id);
  const usage = { userId, categoryId: id };
  const [transactions, budgets, rules] = await Promise.all([
    db.transaction.count({ where: usage }),
    db.budget.count({ where: usage }),
    db.recurringRule.count({ where: usage }),
  ]);
  if (transactions + budgets + rules > 0) {
    throw conflict(
      'Esta categoria está em uso por transações, orçamentos ou recorrências e não pode ser excluída',
      { transactions, budgets, recurringRules: rules },
    );
  }
  await db.category.delete({ where: { id } });
}
