import type { Transaction } from '@sobra/shared';
import { useMutation } from '@tanstack/react-query';
import { translateError } from '@sobra/i18n';
import { useServices } from '../../api/ServicesProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { haptics } from '../../lib/haptics';
import { useToast } from '../../ui/Toast';
import { useLaunch } from '../launch/LaunchSheetProvider';
import { recreateBody } from './listModel';

/**
 * Edit opens the launch sheet in edit mode. Delete has no confirmation, it has undo (DESIGN.md):
 * the row leaves at once (optimistic, rolled back on error) and "Desfazer" recreates the same
 * transaction with a new id. Toasts follow the user's language.
 */
export function useRowActions() {
  const { mutations } = useServices();
  const launch = useLaunch();
  const toast = useToast();
  const { t } = useI18n();
  const remove = useMutation(mutations.transactions.remove);
  const create = useMutation(mutations.transactions.create);

  const restore = (tx: Transaction) =>
    create.mutate(recreateBody(tx), {
      onSuccess: () =>
        toast.show({
          message: t('mobile.transactions.toast.restored', { description: tx.description }),
        }),
      onError: (error) =>
        toast.show({
          tone: 'error',
          message: t('mobile.transactions.toast.undoFailed', { error: translateError(t, error) }),
        }),
    });

  return {
    edit: (tx: Transaction) => launch.open({ edit: tx }),
    remove: (tx: Transaction) => {
      remove.mutate(tx.id, {
        onError: (error) => {
          haptics.error();
          toast.show({
            tone: 'error',
            message: t('mobile.transactions.toast.deleteFailed', {
              description: tx.description,
              error: translateError(t, error),
            }),
          });
        },
      });
      toast.show({
        message: t('mobile.transactions.toast.deleted', { description: tx.description }),
        action: { label: t('common.actions.undo'), onPress: () => restore(tx) },
      });
    },
  };
}
