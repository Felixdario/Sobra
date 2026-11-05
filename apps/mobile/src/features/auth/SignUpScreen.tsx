import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN, registerSchema } from '@financas/shared';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import type { z } from 'zod';
import { useAuth } from '../../api/AuthProvider';
import { useServices } from '../../api/ServicesProvider';
import { makeStyles } from '../../theme/makeStyles';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { AuthLayout, Notice } from './AuthLayout';

type RegisterForm = z.input<typeof registerSchema>;
type RegisterValues = z.output<typeof registerSchema>;

export function SignUpScreen() {
  const styles = useStyles();
  const { mutations } = useServices();
  const auth = useAuth();
  const register = useMutation(mutations.auth.register);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const { control, handleSubmit, formState } = useForm<RegisterForm, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submit = () =>
    handleSubmit((values) => register.mutate(values, { onSuccess: () => auth.markSignedIn() }))();

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Leva meio minuto. Categorias e uma carteira já vêm prontas."
    >
      {register.error ? <Notice tone="danger" message={register.error.message} /> : null}
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.name?.message}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              ref={emailRef}
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.email?.message}
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              ref={passwordRef}
              label="Senha"
              placeholder={`Mínimo de ${PASSWORD_MIN} caracteres`}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.password?.message}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          )}
        />
        <Button
          testID="sign-up"
          label="Criar conta"
          loading={register.isPending}
          onPress={submit}
        />
      </View>
      <View style={styles.footer}>
        <AppText variant="bodySm" tone="secondary">
          Já tem conta?
        </AppText>
        <Link href="/entrar" replace asChild>
          <Button variant="ghost" label="Entrar" />
        </Link>
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[1] },
}));
