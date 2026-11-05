import { zodResolver } from '@hookform/resolvers/zod';
import { categoryName, translateFieldError } from '@sobra/i18n';
import { categoryCreateSchema, type Category, type CategoryKind } from '@sobra/shared';
import { identityColors } from '@sobra/tokens';
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
import { useI18n } from '../i18n/i18nContext';
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
  const { t, errorText } = useI18n();
  // A default category shows its translated name; it is only sent if the person changes it,
  // because renaming clears the `systemKey` (ADR-035).
  const shownName = category ? categoryName(t, category) : '';
  const form = useForm<FormValues, unknown, z.output<typeof categoryCreateSchema>>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: category
      ? { name: shownName, kind: category.kind, color: category.color, icon: category.icon }
      : { name: '', kind, color: identityColors[0].hex, icon: 'sparkles' },
  });
  const { errors } = form.formState;
  // 409 in use or duplicate, 400 validation: shown where the person is looking.
  const failSave = (error: Error) =>
    form.setError('root', {
      message: errorText(error, { CONFLICT: 'web.categories.errors.duplicate' }),
    });
  const failRemove = (error: Error) =>
    form.setError('root', {
      message: errorText(error, { CONFLICT: 'web.categories.errors.inUse' }),
    });

  const submit = form.handleSubmit((values) => {
    if (category) {
      const renamed = values.name.trim() !== shownName.trim();
      const body = {
        ...(renamed ? { name: values.name } : {}),
        color: values.color,
        icon: values.icon,
      };
      update.mutate(
        { id: category.id, body },
        {
          onSuccess: () => (
            toast.success(t('web.categories.toasts.updated', { name: values.name })),
            onClose()
          ),
          onError: failSave,
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => (
          toast.success(t('web.categories.toasts.created', { name: values.name })),
          onClose()
        ),
        onError: failSave,
      });
    }
  });

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <TextField
        data-autofocus
        label={t('web.categories.form.name')}
        autoComplete="off"
        error={translateFieldError(t, errors.name)}
        {...form.register('name')}
      />
      <SelectField
        label={t('web.categories.form.type')}
        disabled={Boolean(category)}
        options={[
          { value: 'expense', label: t('categoryKinds.expense') },
          { value: 'income', label: t('categoryKinds.income') },
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
        {category ? (
          <Button
            variant="ghost"
            className={formStyles.delete}
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(category.id, {
                onSuccess: () => (
                  toast.success(t('web.categories.toasts.deleted', { name: shownName })),
                  onClose()
                ),
                onError: failRemove,
              })
            }
          >
            {remove.isPending ? null : <Trash size={16} strokeWidth={1.75} aria-hidden="true" />}
            {t('common.actions.delete')}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
          {category ? t('common.actions.save') : t('web.categories.form.create')}
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
  const { t } = useI18n();
  const category = target && 'category' in target ? target.category : null;
  const kind = target && 'kind' in target ? target.kind : (category?.kind ?? 'expense');
  return (
    <Sheet
      open={target !== null}
      title={
        category
          ? t('web.categories.edit', { name: categoryName(t, category) })
          : kind === 'income'
            ? t('web.categories.newIncome')
            : t('web.categories.newExpense')
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
