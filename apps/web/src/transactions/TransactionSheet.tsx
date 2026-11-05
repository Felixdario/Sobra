import { zodResolver } from '@hookform/resolvers/zod';
import { categoryName } from '@sobra/i18n';
import { NOTES_MAX, type Account, type Category, type Transaction } from '@sobra/shared';
import { Trash } from 'lucide-react';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormError } from '../auth/FormError';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Sheet } from '../components/Sheet';
import { TextAreaField, TextField } from '../components/TextField';
import { useI18n } from '../i18n/i18nContext';
import styles from './TransactionSheet.module.css';
import {
  emptyForm,
  createTransactionFormSchema,
  formFromTransaction,
  type TransactionFormSchema,
  type TransactionFormValues,
} from './transactionForm';
import type { TransactionActions } from './useTransactionActions';

const TYPES = ['expense', 'income', 'transfer'] as const;

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
  const { t, fmt } = useI18n();
  const schema = useMemo(() => createTransactionFormSchema(t, fmt), [t, fmt]);
  const form = useForm<TransactionFormValues, unknown, ReturnType<TransactionFormSchema['parse']>>({
    resolver: zodResolver(schema),
    defaultValues: transaction
      ? formFromTransaction(transaction, fmt)
      : emptyForm({ accountId: accounts[0]?.id ?? '' }),
  });
  const { errors } = form.formState;
  const type = useWatch({ control: form.control, name: 'type' });
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
  const categoryOptions = categories
    .filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
    .map((c) => ({ value: c.id, label: categoryName(t, c) }));

  const submit = form.handleSubmit((body) => {
    // Optimistic: the lists change at once, so the sheet closes without waiting.
    actions.save(transaction, body);
    onClose();
  });

  return (
    <form id="transaction-form" className={styles.form} onSubmit={submit} noValidate>
      <fieldset className={styles.types}>
        <legend className="visually-hidden">{t('web.transactions.form.type')}</legend>
        {TYPES.map((value) => (
          <label key={value} className={styles.type}>
            <input type="radio" value={value} {...form.register('type')} />
            <span>{t(`transactionTypes.${value}`)}</span>
          </label>
        ))}
      </fieldset>
      <TextField
        label={t('web.transactions.form.amount', { symbol: fmt.currencySymbol })}
        inputMode="decimal"
        autoComplete="off"
        placeholder={fmt.moneyInput(0)}
        data-autofocus
        className={styles.amount}
        error={errors.amount?.message}
        {...form.register('amount')}
      />
      <TextField
        label={t('web.transactions.form.description')}
        autoComplete="off"
        error={errors.description?.message}
        {...form.register('description')}
      />
      <div className={styles.row}>
        <TextField
          label={t('web.transactions.form.date')}
          type="date"
          error={errors.date?.message}
          {...form.register('date')}
        />
        <SelectField
          label={
            type === 'transfer'
              ? t('web.transactions.form.fromAccount')
              : t('web.transactions.form.account')
          }
          options={[
            { value: '', label: t('web.transactions.form.chooseAccount') },
            ...accountOptions,
          ]}
          error={errors.accountId?.message}
          {...form.register('accountId')}
        />
      </div>
      {type === 'transfer' ? (
        <SelectField
          label={t('web.transactions.form.toAccount')}
          options={[
            { value: '', label: t('web.transactions.form.chooseAccount') },
            ...accountOptions,
          ]}
          error={errors.toAccountId?.message}
          {...form.register('toAccountId')}
        />
      ) : (
        <SelectField
          label={t('web.transactions.form.category')}
          options={[
            { value: '', label: t('web.transactions.form.chooseCategory') },
            ...categoryOptions,
          ]}
          error={errors.categoryId?.message}
          {...form.register('categoryId')}
        />
      )}
      <TextAreaField
        label={t('web.transactions.form.notes')}
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
            {t('web.transactions.form.remove')}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" variant="primary">
          {transaction ? t('common.actions.save') : t('web.transactions.form.submitNew')}
        </Button>
      </div>
    </form>
  );
}

export function TransactionSheet({ target, accounts, categories, onClose, actions }: Props) {
  const { t } = useI18n();
  const transaction = target === 'new' ? null : target;
  return (
    <Sheet
      open={target !== null}
      title={transaction ? t('web.transactions.edit') : t('web.transactions.new')}
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
