import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN, registerSchema } from '@financas/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useServices } from '../lib/servicesContext';
import { AuthLayout } from './AuthLayout';
import styles from './Form.module.css';
import { FormError } from './FormError';

export function RegisterPage() {
  const { mutations, hasStoredSession } = useServices();
  const navigate = useNavigate();
  const register = useMutation(mutations.auth.register);
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  if (hasStoredSession() && register.isIdle) return <Navigate to="/" replace />;

  const submit = form.handleSubmit((values) => {
    register.mutate(values, {
      onSuccess: () => {
        toast.success('Conta criada. Contas e categorias padrão já estão prontas.');
        navigate('/', { replace: true });
      },
      onError: (error) => form.setError('root', { message: error.message }),
    });
  });

  return (
    <AuthLayout
      title="Criar conta"
      lead="Contas, categorias e orçamentos começam prontos. Você só lança."
      footer={
        <>
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nome"
          autoComplete="name"
          error={errors.name?.message}
          {...form.register('name')}
        />
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
          autoComplete="new-password"
          hint={`No mínimo ${PASSWORD_MIN} caracteres.`}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <FormError message={errors.root?.message} />
        <Button type="submit" variant="primary" block loading={register.isPending}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
