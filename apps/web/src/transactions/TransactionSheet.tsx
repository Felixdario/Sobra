import { zodResolver } from '@hookform/resolvers/zod';
import { NOTES_MAX, type Account, type Category, type Transaction } from '@financas/shared';
import { Trash } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { FormError } from '../auth/FormError';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Sheet } from '../components/Sheet';
import { TextAreaField, TextField } from '../components/TextField';
import styles from './TransactionSheet.module.css';
import {
  emptyForm,
  formFromTransaction,
  transactionFormSchema,
  type TransactionFormValues,
} from './transactionForm';
import type { TransactionActions } from './useTransactionActions';

const TYPES = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferência' },
] as const;

type Props = {
  /** null: closed; 'new': create; a transaction: edit it. */
  target: Transaction | 'new' | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  actions: TransactionActions;
};

function TransactionForm({
  transaction,
  accounts,
  categories,
  onClose,
  actions,
}: {
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  actions: TransactionActions;
}) {
  const form = useForm<
    TransactionFormValues,
    unknown,
    ReturnType<typeof transactionFormSchema.parse>
  >({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction
      ? formFromTransaction(transaction)
      : emptyForm({ accountId: accounts[0]?.id ?? '' }),
  });
  const { errors } = form.formState;
  const type = useWatch({ control: form.control, name: 'type' });
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
  const categoryOptions = categories
    .filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
    .map((c) => ({ value: c.id, label: c.name }));

  const submit = form.handleSubmit((body) => {
    // Optimistic: the lists change at once, so the sheet closes without waiting.
    actions.save(transaction, body);
    onClose();
  });

  return (
    <form id="transaction-form" className={styles.form} onSubmit={submit} noValidate>
      <fieldset className={styles.types}>
        <legend className="visually-hidden">Tipo</legend>
        {TYPES.map((option) => (
          <label key={option.value} className={styles.type}>
            <input type="radio" value={option.value} {...form.register('type')} />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <TextField
        label="Valor (R$)"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        data-autofocus
        className={styles.amount}
        error={errors.amount?.message}
        {...form.register('amount')}
      />
      <TextField
        label="Descrição"
        autoComplete="off"
        error={errors.description?.message}
        {...form.register('description')}
      />
      <div className={styles.row}>
        <TextField
          label="Data"
          type="date"
          error={errors.date?.message}
          {...form.register('date')}
        />
        <SelectField
          label={type === 'transfer' ? 'De (conta de origem)' : 'Conta'}
          options={[{ value: '', label: 'Escolha a conta' }, ...accountOptions]}
          error={errors.accountId?.message}
          {...form.register('accountId')}
        />
      </div>
      {type === 'transfer' ? (
        <SelectField
          label="Para (conta de destino)"
          options={[{ value: '', label: 'Escolha a conta' }, ...accountOptions]}
          error={errors.toAccountId?.message}
          {...form.register('toAccountId')}
        />
      ) : (
        <SelectField
          label="Categoria"
          options={[{ value: '', label: 'Escolha a categoria' }, ...categoryOptions]}
          error={errors.categoryId?.message}
          {...form.register('categoryId')}
        />
      )}
      <TextAreaField
        label="Observações (opcional)"
        rows={3}
        maxLength={NOTES_MAX}
        error={errors.notes?.message}
        {...form.register('notes')}
      />
      <FormError message={errors.root?.message} />
      <div className={styles.actions}>
        {transaction ? (
          <Button
            variant="ghost"
            className={styles.delete}
            onClick={() => {
              actions.remove(transaction);
              onClose();
            }}
          >
            <Trash size={16} strokeWidth={1.75} aria-hidden="true" />
            Apagar
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {transaction ? 'Salvar' : 'Lançar'}
        </Button>
      </div>
    </form>
  );
}

export function TransactionSheet({ target, accounts, categories, onClose, actions }: Props) {
  const transaction = target === 'new' ? null : target;
  return (
    <Sheet
      open={target !== null}
      title={transaction ? 'Editar transação' : 'Nova transação'}
      onClose={onClose}
    >
      {target !== null ? (
        <TransactionForm
          key={transaction?.id ?? 'new'}
          transaction={transaction}
          accounts={accounts}
          categories={categories}
          onClose={onClose}
          actions={actions}
        />
      ) : null}
    </Sheet>
  );
}
