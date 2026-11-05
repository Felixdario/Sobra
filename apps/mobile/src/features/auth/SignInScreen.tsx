import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@sobra/client';
import { translateError, translateFieldError } from '@sobra/i18n';
import { loginSchema } from '@sobra/shared';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import type { z } from 'zod';
import { useAuth } from '../../api/AuthProvider';
import { useServices } from '../../api/ServicesProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { makeStyles } from '../../theme/makeStyles';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { AuthLayout, Notice } from './AuthLayout';

type LoginForm = z.input<typeof loginSchema>;
type LoginValues = z.output<typeof loginSchema>;

/** Public demo account seeded by the API (apps/api/src/seed/demo.ts). */
export const DEMO_CREDENTIALS = { email: 'demo@sobra.dev', password: 'demo1234' } as const;

export function SignInScreen() {
  const styles = useStyles();
  const { mutations } = useServices();
  const auth = useAuth();
  const { t } = useI18n();
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
    <AuthLayout title={t('common.actions.signIn')} subtitle={t('mobile.auth.tagline')}>
      {auth.notice === 'sessionExpired' ? <Notice message={t('errors.SESSION_EXPIRED')} /> : null}
      {login.error ? (
        <Notice
          tone="danger"
          message={
            // A 401 here means the email or password is wrong, not that a session ended.
            isApiError(login.error) && login.error.status === 401
              ? t('mobile.auth.signIn.invalidCredentials')
              : translateError(t, login.error)
          }
        />
      ) : null}
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label={t('mobile.auth.fields.email')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={translateFieldError(t, formState.errors.email)}
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
              label={t('mobile.auth.fields.password')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={translateFieldError(t, formState.errors.password)}
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
          label={t('common.actions.signIn')}
          loading={login.isPending}
          onPress={() => handleSubmit(signIn)()}
        />
        <Button
          testID="demo"
          variant="secondary"
          label={t('mobile.auth.signIn.demo')}
          disabled={login.isPending}
          onPress={() => signIn(DEMO_CREDENTIALS)}
        />
      </View>
      <View style={styles.footer}>
        <AppText variant="bodySm" tone="secondary">
          {t('mobile.auth.signIn.noAccount')}
        </AppText>
        <Link href="/criar-conta" replace asChild>
          <Button variant="ghost" label={t('common.actions.signUp')} />
        </Link>
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[1] },
}));
