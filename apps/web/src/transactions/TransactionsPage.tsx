import { isOptimisticId } from '@sobra/client/query';
import type { TransactionSortField } from '@sobra/client';
import type { Transaction } from '@sobra/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { EmptyState, Page, Panel } from '../components/Page';
import { Skeleton } from '../components/Skeleton';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import { useWide } from '../lib/useWide';
import { nextSort, readListState, toApiParams, writeListState, type ListState } from './listState';
import { Pagination } from './Pagination';
import { TransactionFilters } from './TransactionFilters';
import { TransactionList } from './TransactionList';
import { TransactionSheet } from './TransactionSheet';
import { TransactionTable } from './TransactionTable';
import styles from './TransactionsPage.module.css';
import { useTransactionActions } from './useTransactionActions';

function hasFilters(state: ListState): boolean {
  return Boolean(state.accountId || state.categoryId || state.type || state.search.trim());
}

function LoadingRows() {
  return (
    <div className={styles.loading} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} height="var(--layout-row-tall)" />
      ))}
    </div>
  );
}

export function TransactionsPage() {
  const { queries } = useServices();
  const { t, fmt } = useI18n();
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => readListState(params), [params]);
  const wide = useWide();
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null);
  const actions = useTransactionActions();

  const list = useQuery({
    ...queries.transactions.list(toApiParams(state)),
    placeholderData: keepPreviousData,
  });
  const accounts = useQuery(queries.accounts.list());
  const categories = useQuery(queries.categories.list());

  const update = useCallback(
    (patch: Partial<ListState>) => {
      setParams((current) => {
        const previous = readListState(current);
        // Any change other than the page itself goes back to page 1.
        const page = 'page' in patch ? (patch.page ?? 1) : 1;
        return writeListState({ ...previous, ...patch, page });
      });
    },
    [setParams],
  );

  const onSort = useCallback(
    (field: TransactionSortField) => update({ sort: nextSort(state.sort, field) }),
    [state.sort, update],
  );
  const onEdit = useCallback((tx: Transaction) => setEditing(tx), []);
  const pendingIds = useMemo(
    () => new Set((list.data?.items ?? []).map((tx) => tx.id).filter(isOptimisticId)),
    [list.data],
  );

  const page = list.data;
  const activeAccounts = (accounts.data ?? []).filter((a) => !a.archived);

  return (
    <Page
      title={t('nav.transactions')}
      actions={
        <Button variant="primary" onClick={() => setEditing('new')} disabled={!accounts.data}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          {t('web.transactions.new')}
        </Button>
      }
    >
      <TransactionFilters
        state={state}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        onChange={update}
      />
      <Panel>
        {list.isError ? (
          <ErrorLine
            what={t('web.transactions.failed')}
            error={list.error}
            onRetry={() => void list.refetch()}
            retrying={list.isFetching}
          />
        ) : !page ? (
          <LoadingRows />
        ) : page.items.length === 0 ? (
          hasFilters(state) ? (
            <EmptyState title={t('common.states.emptyFiltered')}>
              <Button
                variant="secondary"
                onClick={() =>
                  update({
                    accountId: undefined,
                    categoryId: undefined,
                    type: undefined,
                    search: '',
                  })
                }
              >
                {t('common.actions.clearFilters')}
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              title={t('web.transactions.emptyMonth', { month: fmt.monthName(state.month) })}
            >
              <Button variant="secondary" onClick={() => setEditing('new')}>
                {t('web.transactions.firstExpense')}
              </Button>
            </EmptyState>
          )
        ) : (
          <div className={styles.body} data-stale={list.isPlaceholderData}>
            {wide ? (
              <TransactionTable
                rows={page.items}
                sort={state.sort}
                onSort={onSort}
                onEdit={onEdit}
                onRemove={actions.remove}
                pendingIds={pendingIds}
              />
            ) : (
              <TransactionList rows={page.items} onEdit={onEdit} pendingIds={pendingIds} />
            )}
            <Pagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              totalPages={page.totalPages}
              onPage={(next) => update({ page: next })}
              onPageSize={(pageSize) => update({ pageSize })}
            />
          </div>
        )}
      </Panel>
      <TransactionSheet
        target={editing}
        accounts={activeAccounts}
        categories={categories.data ?? []}
        onClose={() => setEditing(null)}
        actions={actions}
      />
    </Page>
  );
}
