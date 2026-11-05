import { zodResolver } from '@hookform/resolvers/zod';
import { translateFieldError, type Translator } from '@sobra/i18n';
import {
  ACCOUNT_TYPES,
  accountTypeSchema,
  iconSchema,
  nameSchema,
  type Account,
  type AccountType,
} from '@sobra/shared';
import { identityColors } from '@sobra/tokens';
import { useMutation } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormError } from '../auth/FormError';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Sheet } from '../components/Sheet';
import { ColorPicker, IconPicker } from '../components/SwatchPicker';
import { TextField } from '../components/TextField';
import type { Format } from '../i18n/format';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import formStyles from '../transactions/TransactionSheet.module.css';
import { DEFAULT_ICON } from './labels';

/** The opening balance is typed in the person's locale ("1.234,56" / "1,234.56"). */
const createAccountFormSchema = (t: Translator, fmt: Format) =>
  z
    .object({
      name: nameSchema(60),
      type: accountTypeSchema,
      initialBalance: z.string(),
      color: z.string().min(1, { error: t('web.accounts.form.colorRequired') }),
      icon: iconSchema,
    })
    .transform((form, ctx) => {
      const initialBalance = form.initialBalance.trim() ? fmt.parseMoney(form.initialBalance) : 0;
      if (initialBalance === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['initialBalance'],
          message: t('web.accounts.form.initialBalanceInvalid', {
            example: fmt.moneyInput(123_456),
            negative: `−${fmt.moneyInput(50_000)}`,
          }),
        });
        return z.NEVER;
      }
      return { ...form, initialBalance };
    });

type AccountFormSchema = ReturnType<typeof createAccountFormSchema>;
type AccountFormValues = z.input<AccountFormSchema>;

function AccountForm({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const { mutations } = useServices();
  const create = useMutation(mutations.accounts.create);
  const update = useMutation(mutations.accounts.update);
  const remove = useMutation(mutations.accounts.remove);
  const { t, fmt, errorText } = useI18n();
  const schema = useMemo(() => createAccountFormSchema(t, fmt), [t, fmt]);
  const form = useForm<AccountFormValues, unknown, z.output<AccountFormSchema>>({
    resolver: zodResolver(schema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          initialBalance: fmt.moneyInput(account.initialBalance),
          color: account.color,
          icon: account.icon,
        }
      : {
          name: '',
          type: 'checking',
          initialBalance: '',
          color: identityColors[0].hex,
          icon: 'landmark',
        },
  });
  const { errors } = form.formState;
  const fail = (error: Error) => form.setError('root', { message: errorText(error) });

  const submit = form.handleSubmit((values) => {
    if (account) {
      const { name, initialBalance, color, icon } = values;
      const body = { name, initialBalance, color, icon };
      update.mutate(
        { id: account.id, body },
        {
          onSuccess: () => {
            toast.success(t('web.accounts.toasts.updated', { name: values.name }));
            onClose();
          },
          onError: fail,
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          toast.success(t('web.accounts.toasts.created', { name: values.name }));
          onClose();
        },
        onError: fail,
      });
    }
  });

  /** DELETE answers 204 (no transactions: deleted) or 200 with the account (archived instead). */
  const removeAccount = (target: Account) =>
    remove.mutate(target.id, {
      onSuccess: (result) => {
        toast.success(
          result.status === 'deleted'
            ? t('web.accounts.toasts.deleted', { name: target.name })
            : t('web.accounts.toasts.archived', { name: target.name }),
        );
        onClose();
      },
      onError: fail,
    });

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <TextField
        data-autofocus
        label={t('web.accounts.form.name')}
        autoComplete="off"
        error={translateFieldError(t, errors.name)}
        {...form.register('name')}
      />
      <SelectField
        label={t('web.accounts.form.type')}
        disabled={Boolean(account)}
        options={ACCOUNT_TYPES.map((type) => ({ value: type, label: t(`accountTypes.${type}`) }))}
        error={translateFieldError(t, errors.type)}
        {...form.register('type', {
          onChange: (event) => {
            if (!form.getFieldState('icon').isDirty) {
              form.setValue('icon', DEFAULT_ICON[event.target.value as AccountType]);
            }
          },
        })}
      />
      <TextField
        label={t('web.accounts.form.initialBalance', { symbol: fmt.currencySymbol })}
        inputMode="decimal"
        autoComplete="off"
        placeholder={fmt.moneyInput(0)}
        hint={t('web.accounts.form.initialBalanceHint', {
          example: `−${fmt.moneyInput(125_000)}`,
        })}
        error={errors.initialBalance?.message}
        {...form.register('initialBalance')}
      />
      <Controller
        control={form.control}
        name="color"
        render={({ field }) => (
          <ColorPicker
            value={field.value}
            onChange={field.onChange}
            error={translateFieldError(t, errors.color)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="icon"
        render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />}
      />
      <FormError message={errors.root?.message} />
      <div className={formStyles.actions}>
        {account && !account.archived ? (
          <Button
            variant="ghost"
            className={formStyles.delete}
            loading={remove.isPending}
            onClick={() => removeAccount(account)}
          >
            {remove.isPending ? null : <Archive size={16} strokeWidth={1.75} aria-hidden="true" />}
            {t('web.accounts.form.removeOrArchive')}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
          {account ? t('common.actions.save') : t('web.accounts.form.create')}
        </Button>
      </div>
    </form>
  );
}

export function AccountSheet({
  target,
  onClose,
}: {
  target: Account | 'new' | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const account = target === 'new' ? null : target;
  return (
    <Sheet
      open={target !== null}
      title={account ? t('web.accounts.edit', { name: account.name }) : t('web.accounts.new')}
      description={account && !account.archived ? t('web.accounts.sheetDescription') : undefined}
      onClose={onClose}
    >
      {target !== null ? (
        <AccountForm key={account?.id ?? 'new'} account={account} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}
