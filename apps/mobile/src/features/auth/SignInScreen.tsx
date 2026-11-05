import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@financas/shared';
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

type LoginForm = z.input<typeof loginSchema>;
type LoginValues = z.output<typeof loginSchema>;

/** Public demo account seeded by the API (apps/api/src/seed/demo.ts). */
export const DEMO_CREDENTIALS = { email: 'demo@financas.dev', password: 'demo1234' } as const;

export function SignInScreen() {
  const styles = useStyles();
  const { mutations } = useServices();
  const auth = useAuth();
  const login = useMutation(mutations.auth.login);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const { control, handleSubmit, formState } = useForm<LoginForm, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signIn = (values: LoginValues) =>
    login.mutate(values, {
      onSuccess: () => auth.markSignedIn(),
    });

  return (
    <AuthLayout title="Entrar" subtitle="Lance no celular, saiba quanto sobra.">
      {auth.notice ? <Notice message={auth.notice} /> : null}
      {login.error ? <Notice tone="danger" message={login.error.message} /> : null}
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              inputMode="email"
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
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.password?.message}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => handleSubmit(signIn)()}
            />
          )}
        />
        <Button
          testID="sign-in"
          label="Entrar"
          loading={login.isPending}
          onPress={() => handleSubmit(signIn)()}
        />
        <Button
          testID="demo"
          variant="secondary"
          label="Usar conta de demonstração"
          disabled={login.isPending}
          onPress={() => signIn(DEMO_CREDENTIALS)}
        />
      </View>
      <View style={styles.footer}>
        <AppText variant="bodySm" tone="secondary">
          Ainda não tem conta?
        </AppText>
        <Link href="/criar-conta" replace asChild>
          <Button variant="ghost" label="Criar conta" />
        </Link>
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[1] },
}));
