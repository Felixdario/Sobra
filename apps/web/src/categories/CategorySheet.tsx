import { zodResolver } from '@hookform/resolvers/zod';
import { categoryCreateSchema, type Category, type CategoryKind } from '@financas/shared';
import { identityColors } from '@financas/tokens';
import { useMutation } from '@tanstack/react-query';
import { Trash } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '../auth/FormError';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Sheet } from '../components/Sheet';
import { ColorPicker, IconPicker } from '../components/SwatchPicker';
import { TextField } from '../components/TextField';
import { useServices } from '../lib/servicesContext';
import formStyles from '../transactions/TransactionSheet.module.css';

type FormValues = z.input<typeof categoryCreateSchema>;

function CategoryForm({
  category,
  kind,
  onClose,
}: {
  category: Category | null;
  kind: CategoryKind;
  onClose: () => void;
}) {
  const { mutations } = useServices();
  const create = useMutation(mutations.categories.create);
  const update = useMutation(mutations.categories.update);
  const remove = useMutation(mutations.categories.remove);
  const form = useForm<FormValues, unknown, z.output<typeof categoryCreateSchema>>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: category
      ? { name: category.name, kind: category.kind, color: category.color, icon: category.icon }
      : { name: '', kind, color: identityColors[0].hex, icon: 'sparkles' },
  });
  const { errors } = form.formState;
  // 409 in use, 400 validation: the API's own pt-BR message, shown where the user is looking.
  const fail = (error: Error) => form.setError('root', { message: error.message });

  const submit = form.handleSubmit((values) => {
    if (category) {
      const body = { name: values.name, color: values.color, icon: values.icon };
      update.mutate(
        { id: category.id, body },
        {
          onSuccess: () => (toast.success(`Categoria ${values.name} atualizada.`), onClose()),
          onError: fail,
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => (toast.success(`Categoria ${values.name} criada.`), onClose()),
        onError: fail,
      });
    }
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
        disabled={Boolean(category)}
        options={[
          { value: 'expense', label: 'Despesa' },
          { value: 'income', label: 'Receita' },
        ]}
        {...form.register('kind')}
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
        {category ? (
          <Button
            variant="ghost"
            className={formStyles.delete}
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(category.id, {
                onSuccess: () => (toast.success(`Categoria ${category.name} excluída.`), onClose()),
                onError: fail,
              })
            }
          >
            {remove.isPending ? null : <Trash size={16} strokeWidth={1.75} aria-hidden="true" />}
            Excluir
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
          {category ? 'Salvar' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  );
}

export type CategoryTarget = { category: Category } | { kind: CategoryKind } | null;

export function CategorySheet({
  target,
  onClose,
}: {
  target: CategoryTarget;
  onClose: () => void;
}) {
  const category = target && 'category' in target ? target.category : null;
  const kind = target && 'kind' in target ? target.kind : (category?.kind ?? 'expense');
  return (
    <Sheet
      open={target !== null}
      title={
        category
          ? `Editar ${category.name}`
          : kind === 'income'
            ? 'Nova categoria de receita'
            : 'Nova categoria de despesa'
      }
      onClose={onClose}
    >
      {target !== null ? (
        <CategoryForm
          key={category?.id ?? `new-${kind}`}
          category={category}
          kind={kind}
          onClose={onClose}
        />
      ) : null}
    </Sheet>
  );
}
