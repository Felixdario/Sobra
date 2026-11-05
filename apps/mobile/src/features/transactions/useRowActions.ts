import type { Transaction } from '@financas/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useServices } from '../../api/ServicesProvider';
import { haptics } from '../../lib/haptics';
import { useToast } from '../../ui/Toast';
import { useLaunch } from '../launch/LaunchSheetProvider';
import { listMutations, recreateBody } from './infiniteTransactions';

/**
 * Edit opens the launch sheet in edit mode. Delete has no confirmation, it has undo (DESIGN.md):
 * the row leaves at once (optimistic, rolled back on error) and "Desfazer" recreates the same
 * transaction with a new id.
 */
export function useRowActions() {
  const { mutations } = useServices();
  const launch = useLaunch();
  const toast = useToast();
  const options = useMemo(() => listMutations(mutations), [mutations]);
  const remove = useMutation(options.remove);
  const create = useMutation(mutations.transactions.create);

  const restore = (tx: Transaction) =>
    create.mutate(recreateBody(tx), {
      onSuccess: () => toast.show({ message: `“${tx.description}” de volta.` }),
      onError: (error) =>
        toast.show({ tone: 'error', message: `Não deu para desfazer. ${error.message}` }),
    });

  return {
    edit: (tx: Transaction) => launch.open({ edit: tx }),
    remove: (tx: Transaction) => {
      remove.mutate(tx.id, {
        onError: (error) => {
          haptics.error();
          toast.show({
            tone: 'error',
            message: `Não deu para apagar “${tx.description}”. ${error.message}`,
          });
        },
      });
      toast.show({
        message: `“${tx.description}” apagada.`,
        action: { label: 'Desfazer', onPress: () => restore(tx) },
      });
    },
  };
}
