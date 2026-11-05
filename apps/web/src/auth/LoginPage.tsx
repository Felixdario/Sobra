import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@sobra/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { translateFieldError } from '@sobra/i18n';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import { AuthLayout } from './AuthLayout';
import styles from './Form.module.css';
import { FormError } from './FormError';
import { DEMO_CREDENTIALS, redirectTarget } from './redirect';

export function LoginPage() {
  const { mutations, hasStoredSession } = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, rich, errorText } = useI18n();
  const login = useMutation(mutations.auth.login);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  if (hasStoredSession() && login.isIdle) {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }

  const submit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate(redirectTarget(location.state), { replace: true }),
      onError: (error) =>
        form.setError('root', {
          message: errorText(error, {
            UNAUTHORIZED: 'web.auth.login.invalidCredentials',
            INVALID_CREDENTIALS: 'web.auth.login.invalidCredentials',
          }),
        }),
    });
  });

  const fillDemo = () => {
    form.clearErrors();
    form.setValue('email', DEMO_CREDENTIALS.email);
    form.setValue('password', DEMO_CREDENTIALS.password);
  };

  return (
    <AuthLayout
      title={t('web.auth.login.title')}
      lead={t('web.auth.login.lead')}
      footer={rich('web.auth.login.noAccount', {
        link: <Link to="/criar-conta">{t('common.actions.signUp')}</Link>,
      })}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
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
          autoComplete="current-password"
          error={translateFieldError(t, errors.password)}
          {...form.register('password')}
        />
        <FormError message={errors.root?.message} />
        <Button type="submit" variant="primary" block loading={login.isPending}>
          {t('common.actions.signIn')}
        </Button>
      </form>
      <p className={styles.divider}>{t('web.auth.login.or')}</p>
      <Button variant="secondary" block onClick={fillDemo}>
        {t('web.auth.login.demo')}
      </Button>
      <p className={styles.note}>{t('web.auth.login.demoNote')}</p>
    </AuthLayout>
  );
}
