import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN, registerSchema } from '@sobra/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { translateFieldError } from '@sobra/i18n';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { browserLocale } from '../i18n/browserLocale';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import { AuthLayout } from './AuthLayout';
import styles from './Form.module.css';
import { FormError } from './FormError';

export function RegisterPage() {
  const { mutations, hasStoredSession } = useServices();
  const navigate = useNavigate();
  const { t, rich, errorText } = useI18n();
  const register = useMutation(mutations.auth.register);
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  if (hasStoredSession() && register.isIdle) return <Navigate to="/" replace />;

  const submit = form.handleSubmit((values) => {
    // The browser's language becomes the account's (the API resolves the tag, ADR-035).
    register.mutate(
      { ...values, locale: browserLocale() },
      {
        onSuccess: () => {
          toast.success(t('web.auth.register.created'));
          navigate('/', { replace: true });
        },
        onError: (error) =>
          form.setError('root', {
            message: errorText(error, { CONFLICT: 'web.auth.register.emailTaken' }),
          }),
      },
    );
  });

  return (
    <AuthLayout
      title={t('web.auth.register.title')}
      lead={t('web.auth.register.lead')}
      footer={rich('web.auth.register.hasAccount', {
        link: <Link to="/entrar">{t('common.actions.signIn')}</Link>,
      })}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label={t('web.auth.fields.name')}
          autoComplete="name"
          error={translateFieldError(t, errors.name)}
          {...form.register('name')}
        />
        <TextField
          label={t('web.auth.fields.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          error={translateFieldError(t, errors.email)}
          {...form.register('email')}
        />
        <TextField
          label={t('web.auth.fields.password')}
          type="password"
          autoComplete="new-password"
          hint={t('web.auth.register.passwordHint', { min: PASSWORD_MIN })}
          error={translateFieldError(t, errors.password)}
          {...form.register('password')}
        />
        <FormError message={errors.root?.message} />
        <Button type="submit" variant="primary" block loading={register.isPending}>
          {t('common.actions.signUp')}
        </Button>
      </form>
    </AuthLayout>
  );
}
