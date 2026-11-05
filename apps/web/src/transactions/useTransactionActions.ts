import type { Transaction, TransactionCreate } from '@financas/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  const create = useMutation(mutations.transactions.create);
  const update = useMutation(mutations.transactions.update);
  const remove = useMutation(mutations.transactions.remove);

  const save = (transaction: Transaction | null, body: TransactionCreate) => {
    if (transaction) {
      update.mutate(
        { id: transaction.id, body: { ...body, notes: body.notes ?? null } },
        {
          onSuccess: () => toast.success('Transação atualizada.'),
          onError: (error) => toast.error(`Não deu para salvar: ${error.message}`),
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: () => toast.success('Transação lançada.'),
        onError: (error) => toast.error(`Não deu para lançar: ${error.message}`),
      });
    }
  };

  const removeWithUndo = (tx: Transaction) =>
    remove.mutate(tx.id, {
      onSuccess: () =>
        toast(`“${tx.description}” apagada.`, {
          action: {
            label: 'Desfazer',
            onClick: () =>
              create.mutate(bodyFromTransaction(tx), {
                onSuccess: () => toast.success('Transação restaurada.'),
                onError: (error) => toast.error(`Não deu para restaurar: ${error.message}`),
              }),
          },
        }),
      onError: (error) => toast.error(`Não deu para apagar: ${error.message}`),
    });

  return { save, remove: removeWithUndo };
}

export type TransactionActions = ReturnType<typeof useTransactionActions>;
