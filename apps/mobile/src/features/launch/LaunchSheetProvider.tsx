import { cents, type Transaction } from '@financas/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '../../api/ServicesProvider';
import { haptics } from '../../lib/haptics';
import { formatMoney } from '../../lib/money';
import { storage } from '../../lib/storage';
import { BottomSheet } from '../../ui/BottomSheet';
import { useToast } from '../../ui/Toast';
import { todayKey } from './dates';
import { LaunchFooter, LaunchForm, LaunchHeader } from './LaunchForm';
import {
  buildPayload,
  buildUpdate,
  draftFromTransaction,
  emptyDraft,
  pickDefaultAccount,
  rankCategories,
  type LaunchDraft,
  type LaunchType,
} from './launchModel';

const LAST_ACCOUNT_KEY = 'sobra.lastAccount';
/** Enough history to rank categories by use without a dedicated endpoint. */
export const RECENT_PARAMS = { pageSize: 100 } as const;

type OpenOptions = { type?: LaunchType; edit?: Transaction };

type LaunchApi = { open: (options?: OpenOptions) => void };

const LaunchContext = createContext<LaunchApi | null>(null);

export function LaunchSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LaunchDraft>(() => emptyDraft('expense', todayKey()));
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);

  const api = useMemo<LaunchApi>(
    () => ({
      open: ({ type = 'expense', edit } = {}) => {
        setDraft(edit ? draftFromTransaction(edit) : emptyDraft(type, todayKey()));
        storage
          .get(LAST_ACCOUNT_KEY)
          .then(setLastAccountId)
          .catch(() => {});
        setOpen(true);
      },
    }),
    [],
  );
  const close = useCallback(() => setOpen(false), []);

  return (
    <LaunchContext value={api}>
      {children}
      <LaunchSheet
        open={open}
        onClose={close}
        draft={draft}
        onChange={setDraft}
        lastAccountId={lastAccountId}
      />
    </LaunchContext>
  );
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  draft: LaunchDraft;
  onChange: (draft: LaunchDraft) => void;
  lastAccountId: string | null;
};

function LaunchSheet({ open, onClose, draft, onChange, lastAccountId }: SheetProps) {
  const { queries, mutations } = useServices();
  const toast = useToast();
  const enabled = open;
  const accounts = useQuery({ ...queries.accounts.list(), enabled });
  const categories = useQuery({ ...queries.categories.list(), enabled });
  const recent = useQuery({ ...queries.transactions.list(RECENT_PARAMS), enabled });
  const create = useMutation(mutations.transactions.create);
  const update = useMutation(mutations.transactions.update);
  const editing = draft.editing;

  const activeAccounts = useMemo(
    () => (accounts.data ?? []).filter((account) => !account.archived),
    [accounts.data],
  );
  const ranked = useMemo(
    () => rankCategories(categories.data ?? [], recent.data?.items ?? [], draft.type),
    [categories.data, recent.data, draft.type],
  );
  const accountId =
    draft.accountId ??
    pickDefaultAccount(activeAccounts, recent.data?.items ?? [], lastAccountId)?.id ??
    null;
  const effective = { ...draft, accountId };
  const payload = editing ? null : buildPayload(effective, ranked);
  const updateBody = editing ? buildUpdate(effective, ranked) : null;

  const saveEdit = () => {
    if (!editing || !updateBody) return;
    haptics.success();
    onClose();
    update.mutate(
      { id: editing.id, body: updateBody },
      {
        onSuccess: () => toast.show({ message: 'Transação atualizada.' }),
        onError: (error) => {
          haptics.error();
          toast.show({
            tone: 'error',
            message: `Não deu para salvar a alteração. ${error.message}`,
          });
        },
      },
    );
  };

  const save = () => {
    if (editing) return saveEdit();
    if (!payload) return;
    const category = ranked.find((item) => item.id === draft.categoryId);
    const summary = `${formatMoney(cents(payload.amount), 'never')} em ${category?.name ?? 'categoria'}`;
    haptics.success();
    onClose();
    storage.set(LAST_ACCOUNT_KEY, payload.accountId).catch(() => {});
    const submit = () =>
      create.mutate(payload, {
        onError: (error) => {
          haptics.error();
          toast.show({
            tone: 'error',
            message: `Não deu para salvar ${summary}. ${error.message}`,
            action: { label: 'Tentar de novo', onPress: submit },
          });
        },
      });
    submit();
    toast.show({
      message:
        payload.type === 'expense'
          ? `Gasto de ${summary} lançado.`
          : `Receita de ${summary} lançada.`,
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={
        editing ? 'Editar transação' : draft.type === 'expense' ? 'Lançar gasto' : 'Lançar receita'
      }
      header={<LaunchHeader draft={effective} onChange={onChange} />}
      footer={
        <LaunchFooter
          draft={effective}
          accountsCount={activeAccounts.length}
          canSave={editing ? updateBody !== null : payload !== null}
          onSave={save}
        />
      }
    >
      <LaunchForm
        draft={effective}
        onChange={onChange}
        categories={ranked}
        accounts={activeAccounts}
        categoriesState={
          categories.isError
            ? 'error'
            : categories.isPending || recent.isLoading
              ? 'loading'
              : 'ready'
        }
        onRetry={() => {
          categories.refetch();
          recent.refetch();
        }}
      />
    </BottomSheet>
  );
}

export function useLaunch(): LaunchApi {
  const value = use(LaunchContext);
  if (!value) throw new Error('useLaunch precisa de <LaunchSheetProvider>');
  return value;
}
