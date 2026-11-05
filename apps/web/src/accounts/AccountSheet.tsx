import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACCOUNT_TYPES,
  accountTypeSchema,
  centsToReais,
  iconSchema,
  nameSchema,
  parseBRL,
  type Account,
  type AccountType,
} from '@sobra/shared';
import { identityColors } from '@sobra/tokens';
import { useMutation } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormError } from '../auth/FormError';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Sheet } from '../components/Sheet';
import { ColorPicker, IconPicker } from '../components/SwatchPicker';
import { TextField } from '../components/TextField';
import { useServices } from '../lib/servicesContext';
import formStyles from '../transactions/TransactionSheet.module.css';
import { ACCOUNT_TYPE_LABELS, DEFAULT_ICON } from './labels';

const accountFormSchema = z
  .object({
    name: nameSchema(60),
    type: accountTypeSchema,
    initialBalance: z.string(),
    color: z.string().min(1, { error: 'Escolha uma cor' }),
    icon: iconSchema,
  })
  .transform((form, ctx) => {
    const initialBalance = form.initialBalance.trim() ? parseBRL(form.initialBalance) : 0;
    if (initialBalance === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['initialBalance'],
        message: 'Valor inválido: use 1.234,56 (ou −500,00 para um cartão com fatura)',
      });
      return z.NEVER;
    }
    return { ...form, initialBalance };
  });

type AccountFormValues = z.input<typeof accountFormSchema>;

function AccountForm({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const { mutations } = useServices();
  const create = useMutation(mutations.accounts.create);
  const update = useMutation(mutations.accounts.update);
  const remove = useMutation(mutations.accounts.remove);
  const form = useForm<AccountFormValues, unknown, z.output<typeof accountFormSchema>>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          initialBalance: centsToReais(account.initialBalance),
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
  const fail = (error: Error) => form.setError('root', { message: error.message });

  const submit = form.handleSubmit((values) => {
    if (account) {
      const { name, initialBalance, color, icon } = values;
      const body = { name, initialBalance, color, icon };
      update.mutate(
        { id: account.id, body },
        {
          onSuccess: () => {
            toast.success(`Conta “${values.name}” atualizada.`);
            onClose();
          },
          onError: fail,
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          toast.success(`Conta “${values.name}” criada.`);
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
            ? `Conta “${target.name}” excluída: não tinha lançamentos.`
            : `${target.name} tem lançamentos e foi arquivada: o histórico continua nos relatórios.`,
        );
        onClose();
      },
      onError: fail,
    });

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <TextField
        data-autofocus
        label="Nome"
        autoComplete="off"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <SelectField
        label="Tipo"
        disabled={Boolean(account)}
        options={ACCOUNT_TYPES.map((type) => ({ value: type, label: ACCOUNT_TYPE_LABELS[type] }))}
        error={errors.type?.message}
        {...form.register('type', {
          onChange: (event) => {
            if (!form.getFieldState('icon').isDirty) {
              form.setValue('icon', DEFAULT_ICON[event.target.value as AccountType]);
            }
          },
        })}
      />
      <TextField
        label="Saldo inicial (R$)"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        hint="Cartão de crédito com fatura em aberto: valor negativo, como −1.250,00."
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
            error={errors.color?.message}
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
            Excluir ou arquivar
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
          {account ? 'Salvar' : 'Criar conta'}
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
  const account = target === 'new' ? null : target;
  return (
    <Sheet
      open={target !== null}
      title={account ? `Editar ${account.name}` : 'Nova conta'}
      description={
        account && !account.archived
          ? 'Uma conta sem lançamentos é excluída; com lançamentos, é arquivada e o histórico fica.'
          : undefined
      }
      onClose={onClose}
    >
      {target !== null ? (
        <AccountForm key={account?.id ?? 'new'} account={account} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}
