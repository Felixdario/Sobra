import { categoryName } from '@sobra/i18n';
import { previousMonth, type Budget, type Category, type MonthKey } from '@sobra/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Pencil, Trash } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { BudgetMeter } from '../components/BudgetMeter';
import meterStyles from '../components/BudgetMeter.module.css';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { EmptyState, Page, Panel } from '../components/Page';
import { Skeleton } from '../components/Skeleton';
import { MonthPicker } from '../dashboard/MonthPicker';
import { useI18n } from '../i18n/i18nContext';
import { currentMonth, parseMonthParam } from '../lib/month';
import { useServices } from '../lib/servicesContext';
import styles from './BudgetsPage.module.css';
import { InlineAmount } from './InlineAmount';

type Row = { category: Category; budget: Budget | undefined };

function BudgetRow({
  row,
  month,
  editing,
  onEdit,
  onDone,
}: {
  row: Row;
  month: MonthKey;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  const { mutations } = useServices();
  const upsert = useMutation(mutations.budgets.upsert);
  const remove = useMutation(mutations.budgets.remove);
  const { category, budget } = row;
  const { t, fmt, errorText } = useI18n();
  const name = categoryName(t, category);

  const save = (amount: number) =>
    upsert.mutate(
      { categoryId: category.id, month, amount },
      {
        onSuccess: () => {
          toast.success(t('web.budgets.toasts.saved', { name, amount: fmt.money(amount) }));
          onDone();
        },
        onError: (error) =>
          toast.error(t('web.budgets.toasts.saveFailed', { reason: errorText(error) })),
      },
    );

  const editor = editing ? (
    <InlineAmount
      label={t('web.budgets.inputLabel', { name, month: fmt.monthName(month) })}
      initial={budget?.amount ?? null}
      saving={upsert.isPending}
      onSave={save}
      onCancel={onDone}
    />
  ) : null;

  if (!budget) {
    return (
      <li className={styles.unset}>
        <span className={meterStyles.name}>
          <span
            className={meterStyles.square}
            style={{ background: category.color }}
            aria-hidden="true"
          />
          {name}
        </span>
        {editor ?? (
          <span className={styles.unsetActions}>
            <span className={styles.muted}>{t('web.budgets.unset')}</span>
            <Button
              variant="secondary"
              onClick={onEdit}
              aria-label={t('web.budgets.setA11y', { name })}
            >
              {t('web.budgets.set')}
            </Button>
          </span>
        )}
      </li>
    );
  }

  return (
    <BudgetMeter
      name={name}
      color={category.color}
      budgeted={budget.amount}
      actual={budget.spent}
      values={editor ?? undefined}
      actions={
        editing ? null : (
          <span className={styles.rowActions}>
            <Button
              variant="ghost"
              onClick={onEdit}
              aria-label={t('web.budgets.editA11y', { name })}
            >
              <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('common.actions.edit')}
            </Button>
            <Button
              variant="ghost"
              iconOnly
              title={t('web.budgets.remove')}
              aria-label={t('web.budgets.removeA11y', { name })}
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(budget.id, {
                  onSuccess: () => toast(t('web.budgets.toasts.removed', { name })),
                  onError: (error) =>
                    toast.error(t('web.budgets.toasts.removeFailed', { reason: errorText(error) })),
                })
              }
            >
              {remove.isPending ? null : <Trash size={16} strokeWidth={1.75} aria-hidden="true" />}
            </Button>
          </span>
        )
      }
    />
  );
}

export function BudgetsPage() {
  const { queries, mutations } = useServices();
  const { t, fmt, errorText } = useI18n();
  const [params, setParams] = useSearchParams();
  const month = parseMonthParam(params.get('mes'));
  const current = currentMonth();
  const [editing, setEditing] = useState<string | null>(null);
  const budgets = useQuery(queries.budgets.list(month));
  const categories = useQuery(queries.categories.list({ kind: 'expense' }));
  const copy = useMutation(mutations.budgets.copy);
  const from = previousMonth(month);

  const rows: Row[] = (categories.data ?? []).map((category) => ({
    category,
    budget: budgets.data?.find((b) => b.categoryId === category.id),
  }));
  const withBudget = rows.filter((r) => r.budget);
  const totals = withBudget.reduce(
    (sum, r) => ({
      budgeted: sum.budgeted + (r.budget?.amount ?? 0),
      spent: sum.spent + (r.budget?.spent ?? 0),
    }),
    { budgeted: 0, spent: 0 },
  );

  const copyPrevious = () => {
    const before = budgets.data?.length ?? 0;
    copy.mutate(
      { from, to: month },
      {
        onSuccess: (result) => {
          const added = result.length - before;
          toast.success(
            added > 0
              ? t('web.budgets.toasts.copied', { count: added, month: fmt.monthName(from) })
              : t('web.budgets.toasts.nothingToCopy', {
                  month: fmt.monthName(month),
                  from: fmt.monthName(from),
                }),
          );
        },
        onError: (error) =>
          toast.error(t('web.budgets.toasts.copyFailed', { reason: errorText(error) })),
      },
    );
  };

  const failed = budgets.isError ? budgets : categories.isError ? categories : null;

  return (
    <Page
      title={t('nav.budgets')}
      actions={
        <Button variant="secondary" onClick={copyPrevious} loading={copy.isPending}>
          {copy.isPending ? null : <Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
          {t('web.budgets.copyFrom', { month: fmt.monthName(from) })}
        </Button>
      }
    >
      <MonthPicker
        month={month}
        current={current}
        onChange={(next) => setParams(next === current ? {} : { mes: next })}
      />
      <Panel
        title={t('web.budgets.panel', { month: fmt.monthName(month) })}
        titleId="orcamentos-titulo"
        aside={
          withBudget.length > 0 ? (
            <span className={`${styles.muted} num`}>
              {t('web.budgets.totals', {
                spent: fmt.money(totals.spent),
                budgeted: fmt.money(totals.budgeted),
              })}
            </span>
          ) : null
        }
      >
        {failed ? (
          <ErrorLine
            what={t('web.budgets.failed')}
            error={failed.error}
            onRetry={() => {
              void budgets.refetch();
              void categories.refetch();
            }}
            retrying={budgets.isFetching || categories.isFetching}
          />
        ) : !budgets.data || !categories.data ? (
          <div className={styles.loading} aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height="var(--space-16)" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={t('web.budgets.noCategories')}>
            <p>{t('web.budgets.noCategoriesHint')}</p>
          </EmptyState>
        ) : (
          <>
            {withBudget.length === 0 ? (
              <p className={styles.muted}>
                {t('web.budgets.none', {
                  month: fmt.monthName(month),
                  from: fmt.monthName(from),
                })}
              </p>
            ) : null}
            <ul className={meterStyles.list}>
              {rows.map((row) => (
                <BudgetRow
                  key={row.category.id}
                  row={row}
                  month={month}
                  editing={editing === row.category.id}
                  onEdit={() => setEditing(row.category.id)}
                  onDone={() => setEditing(null)}
                />
              ))}
            </ul>
          </>
        )}
      </Panel>
    </Page>
  );
}
