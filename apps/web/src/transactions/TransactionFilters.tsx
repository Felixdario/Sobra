import { categoryName } from '@sobra/i18n';
import type { Account, Category } from '@sobra/shared';
import { useEffect, useState } from 'react';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { MonthPicker } from '../dashboard/MonthPicker';
import { useI18n } from '../i18n/i18nContext';
import { currentMonth } from '../lib/month';
import type { ListState } from './listState';
import styles from './TransactionFilters.module.css';

export const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  state: ListState;
  accounts: Account[];
  categories: Category[];
  onChange: (patch: Partial<ListState>) => void;
};

/** One row above the table, scoping everything below it (dataviz: filters in one row). */
export function TransactionFilters({ state, accounts, categories, onChange }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState(state.search);

  useEffect(() => {
    if (search === state.search) return;
    const timer = setTimeout(() => onChange({ search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, state.search, onChange]);

  return (
    <div className={styles.filters} role="search" aria-label={t('web.transactions.filters.region')}>
      <MonthPicker
        month={state.month}
        current={currentMonth()}
        onChange={(month) => onChange({ month })}
      />
      <div className={styles.fields}>
        <TextField
          label={t('web.transactions.filters.search')}
          hideLabel
          compact
          type="search"
          placeholder={t('web.transactions.filters.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={styles.search}
        />
        <SelectField
          label={t('web.transactions.filters.account')}
          hideLabel
          className={styles.select}
          value={state.accountId ?? ''}
          onChange={(event) => onChange({ accountId: event.target.value || undefined })}
          options={[
            { value: '', label: t('web.transactions.filters.allAccounts') },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <SelectField
          label={t('web.transactions.filters.category')}
          hideLabel
          className={styles.select}
          value={state.categoryId ?? ''}
          onChange={(event) => onChange({ categoryId: event.target.value || undefined })}
          options={[
            { value: '', label: t('web.transactions.filters.allCategories') },
            ...categories.map((c) => ({
              value: c.id,
              label: t(
                c.kind === 'income'
                  ? 'web.transactions.filters.categoryIncome'
                  : 'web.transactions.filters.categoryExpense',
                { name: categoryName(t, c) },
              ),
            })),
          ]}
        />
        <SelectField
          label={t('web.transactions.filters.type')}
          hideLabel
          className={styles.select}
          value={state.type ?? ''}
          onChange={(event) =>
            onChange({ type: (event.target.value || undefined) as ListState['type'] })
          }
          options={[
            { value: '', label: t('web.transactions.filters.allTypes') },
            { value: 'expense', label: t('web.transactions.filters.expenses') },
            { value: 'income', label: t('web.transactions.filters.incomes') },
            { value: 'transfer', label: t('web.transactions.filters.transfers') },
          ]}
        />
      </div>
    </div>
  );
}
