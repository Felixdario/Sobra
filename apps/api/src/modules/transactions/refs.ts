import type { TransactionCreate } from '@sobra/shared';
import type { Db } from '../../lib/db';
import { badRequest } from '../../lib/errors';
import { findOwnedAccount } from '../accounts/service';
import { findOwnedCategory } from '../categories/service';

const ARCHIVED_ACCOUNT = 'Conta arquivada não recebe novas transações';

export type TransactionRefs = {
  type: TransactionCreate['type'];
  accountId: string;
  toAccountId?: string | null | undefined;
  categoryId?: string | null | undefined;
};

/**
 * Checks that every account/category referenced belongs to `userId` (404 otherwise), that the
 * category kind matches the type, and that accounts are not archived. `previous` lists account
 * ids already linked to the record, which may stay even if archived since then.
 */
export async function assertTransactionRefs(
  db: Db,
  userId: string,
  refs: TransactionRefs,
  previous: readonly string[] = [],
): Promise<void> {
  const accountIds = [refs.accountId];
  if (refs.type === 'transfer') {
    if (!refs.toAccountId) throw badRequest('Informe a conta de destino');
    accountIds.push(refs.toAccountId);
  }
  for (const id of accountIds) {
    const account = await findOwnedAccount(db, userId, id);
    if (account.archived && !previous.includes(id)) throw badRequest(ARCHIVED_ACCOUNT);
  }

  if (refs.type !== 'transfer') {
    if (!refs.categoryId) throw badRequest('Informe uma categoria');
    const category = await findOwnedCategory(db, userId, refs.categoryId);
    if (category.kind !== refs.type) {
      throw badRequest(
        refs.type === 'income'
          ? 'Uma receita só pode usar categoria de receita'
          : 'Uma despesa só pode usar categoria de despesa',
      );
    }
  }
}
