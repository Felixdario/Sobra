import { cents, type Transaction } from '@sobra/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { translateError } from '@sobra/i18n';
import { useServices } from '../../api/ServicesProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { haptics } from '../../lib/haptics';
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
  const i18n = useI18n();
  const { t } = i18n;
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
    () => rankCategories(categories.data ?? [], recent.data?.items ?? [], draft.type, i18n),
    [categories.data, recent.data, draft.type, i18n],
  );
  const accountId =
    draft.accountId ??
    pickDefaultAccount(activeAccounts, recent.data?.items ?? [], lastAccountId)?.id ??
    null;
  const effective = { ...draft, accountId };
  const payload = editing ? null : buildPayload(effective, ranked, i18n);
  const updateBody = editing ? buildUpdate(effective, ranked, i18n) : null;

  const saveEdit = () => {
    if (!editing || !updateBody) return;
    haptics.success();
    onClose();
    update.mutate(
      { id: editing.id, body: updateBody },
      {
        onSuccess: () => toast.show({ message: t('mobile.launch.toast.updated') }),
        onError: (error) => {
          haptics.error();
          toast.show({
            tone: 'error',
            message: t('mobile.launch.toast.updateFailed', { error: translateError(t, error) }),
          });
        },
      },
    );
  };

  const save = () => {
    if (editing) return saveEdit();
    if (!payload) return;
    const category = ranked.find((item) => item.id === draft.categoryId);
    const amount = i18n.money(cents(payload.amount), 'never');
    const categoryLabel = category ? i18n.category(category) : t('mobile.launch.categoryFallback');
    haptics.success();
    onClose();
    storage.set(LAST_ACCOUNT_KEY, payload.accountId).catch(() => {});
    const submit = () =>
      create.mutate(payload, {
        onError: (error) => {
          haptics.error();
          toast.show({
            tone: 'error',
            message: t('mobile.launch.toast.saveFailed', {
              amount,
              category: categoryLabel,
              error: translateError(t, error),
            }),
            action: { label: t('common.actions.retry'), onPress: submit },
          });
        },
      });
    submit();
    toast.show({
      message: t(
        payload.type === 'expense'
          ? 'mobile.launch.toast.expenseSaved'
          : 'mobile.launch.toast.incomeSaved',
        { amount, category: categoryLabel },
      ),
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={
        editing
          ? t('mobile.launch.title.edit')
          : t(
              draft.type === 'expense'
                ? 'mobile.launch.title.expense'
                : 'mobile.launch.title.income',
            )
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
  if (!value) throw new Error('useLaunch needs <LaunchSheetProvider>');
  return value;
}
