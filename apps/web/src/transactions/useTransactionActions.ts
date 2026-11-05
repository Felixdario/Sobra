import type { Transaction, TransactionCreate } from '@sobra/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import { bodyFromTransaction } from './transactionForm';

/**
 * Save and delete, owned by the page (not the sheet): the sheet closes at once and the
 * per-call callbacks of TanStack only fire while the component that called `mutate` is mounted.
 *
 * Delete has no confirmation dialog, it has undo (DESIGN.md): the row leaves the list at once
 * (optimistic, rolled back on error) and "Desfazer" creates the same transaction again, with a new
 * id that nothing on screen depends on.
 */
export function useTransactionActions() {
  const { mutations } = useServices();
  const { t, errorText } = useI18n();
  const create = useMutation(mutations.transactions.create);
  const update = useMutation(mutations.transactions.update);
  const remove = useMutation(mutations.transactions.remove);

  const save = (transaction: Transaction | null, body: TransactionCreate) => {
    if (transaction) {
      update.mutate(
        { id: transaction.id, body: { ...body, notes: body.notes ?? null } },
        {
          onSuccess: () => toast.success(t('web.transactions.toasts.updated')),
          onError: (error) =>
            toast.error(t('web.transactions.toasts.saveFailed', { reason: errorText(error) })),
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: () => toast.success(t('web.transactions.toasts.created')),
        onError: (error) =>
          toast.error(t('web.transactions.toasts.createFailed', { reason: errorText(error) })),
      });
    }
  };

  const removeWithUndo = (tx: Transaction) =>
    remove.mutate(tx.id, {
      onSuccess: () =>
        toast(t('web.transactions.toasts.deleted', { description: tx.description }), {
          action: {
            label: t('common.actions.undo'),
            onClick: () =>
              create.mutate(bodyFromTransaction(tx), {
                onSuccess: () => toast.success(t('web.transactions.toasts.restored')),
                onError: (error) =>
                  toast.error(
                    t('web.transactions.toasts.restoreFailed', { reason: errorText(error) }),
                  ),
              }),
          },
        }),
      onError: (error) =>
        toast.error(t('web.transactions.toasts.deleteFailed', { reason: errorText(error) })),
    });

  return { save, remove: removeWithUndo };
}

export type TransactionActions = ReturnType<typeof useTransactionActions>;
