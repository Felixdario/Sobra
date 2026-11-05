import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@financas/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useServices } from '../lib/servicesContext';
import { AuthLayout } from './AuthLayout';
import styles from './Form.module.css';
import { FormError } from './FormError';
import { DEMO_CREDENTIALS, redirectTarget } from './redirect';

export function LoginPage() {
  const { mutations, hasStoredSession } = useServices();
  const navigate = useNavigate();
  const location = useLocation();
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
      onError: (error) => form.setError('root', { message: error.message }),
    });
  });

  const fillDemo = () => {
    form.clearErrors();
    form.setValue('email', DEMO_CREDENTIALS.email);
    form.setValue('password', DEMO_CREDENTIALS.password);
  };

  return (
    <AuthLayout
      title="Entrar no Sobra"
      lead="Quanto você tem, para onde foi o dinheiro e quanto sobra no mês."
      footer={
        <>
          Ainda não tem conta? <Link to="/criar-conta">Criar conta</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <FormError message={errors.root?.message} />
        <Button type="submit" variant="primary" block loading={login.isPending}>
          Entrar
        </Button>
      </form>
      <p className={styles.divider}>ou</p>
      <Button variant="secondary" block onClick={fillDemo}>
        Entrar com a conta de demonstração
      </Button>
      <p className={styles.note}>
        Preenche o e-mail e a senha da Ana Demo: seis meses de dados sintéticos.
      </p>
    </AuthLayout>
  );
}
