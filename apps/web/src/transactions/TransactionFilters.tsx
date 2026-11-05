import type { Account, Category } from '@sobra/shared';
import { useEffect, useState } from 'react';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { MonthPicker } from '../dashboard/MonthPicker';
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
  const [search, setSearch] = useState(state.search);

  useEffect(() => {
    if (search === state.search) return;
    const timer = setTimeout(() => onChange({ search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, state.search, onChange]);

  return (
    <div className={styles.filters} role="search" aria-label="Filtrar transações">
      <MonthPicker
        month={state.month}
        current={currentMonth()}
        onChange={(month) => onChange({ month })}
      />
      <div className={styles.fields}>
        <TextField
          label="Buscar na descrição"
          hideLabel
          compact
          type="search"
          placeholder="Buscar na descrição"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={styles.search}
        />
        <SelectField
          label="Conta"
          hideLabel
          className={styles.select}
          value={state.accountId ?? ''}
          onChange={(event) => onChange({ accountId: event.target.value || undefined })}
          options={[
            { value: '', label: 'Todas as contas' },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <SelectField
          label="Categoria"
          hideLabel
          className={styles.select}
          value={state.categoryId ?? ''}
          onChange={(event) => onChange({ categoryId: event.target.value || undefined })}
          options={[
            { value: '', label: 'Todas as categorias' },
            ...categories.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.kind === 'income' ? 'receita' : 'despesa'})`,
            })),
          ]}
        />
        <SelectField
          label="Tipo"
          hideLabel
          className={styles.select}
          value={state.type ?? ''}
          onChange={(event) =>
            onChange({ type: (event.target.value || undefined) as ListState['type'] })
          }
          options={[
            { value: '', label: 'Todos os tipos' },
            { value: 'expense', label: 'Despesas' },
            { value: 'income', label: 'Receitas' },
            { value: 'transfer', label: 'Transferências' },
          ]}
        />
      </div>
    </div>
  );
}
