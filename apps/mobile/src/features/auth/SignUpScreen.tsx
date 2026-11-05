import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@sobra/client';
import { translateError, translateFieldError } from '@sobra/i18n';
import { PASSWORD_MIN, registerSchema } from '@sobra/shared';
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

type RegisterForm = z.input<typeof registerSchema>;
type RegisterValues = z.output<typeof registerSchema>;

export function SignUpScreen() {
  const styles = useStyles();
  const { mutations } = useServices();
  const auth = useAuth();
  const { t, locale } = useI18n();
  const register = useMutation(mutations.auth.register);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const { control, handleSubmit, formState } = useForm<RegisterForm, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submit = () =>
    handleSubmit((values) =>
      // The account starts in the language the app is showing (the device's, before sign-in).
      register.mutate({ ...values, locale }, { onSuccess: () => auth.markSignedIn() }),
    )();

  return (
    <AuthLayout title={t('common.actions.signUp')} subtitle={t('mobile.auth.signUp.subtitle')}>
      {register.error ? (
        <Notice
          tone="danger"
          message={
            isApiError(register.error) && register.error.status === 409
              ? t('mobile.auth.signUp.emailTaken')
              : translateError(t, register.error)
          }
        />
      ) : null}
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label={t('mobile.auth.fields.name')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={translateFieldError(t, formState.errors.name)}
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
              label={t('mobile.auth.fields.email')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={translateFieldError(t, formState.errors.email)}
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
              label={t('mobile.auth.fields.password')}
              placeholder={t('mobile.auth.fields.passwordPlaceholder', { min: PASSWORD_MIN })}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={translateFieldError(t, formState.errors.password)}
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
          label={t('common.actions.signUp')}
          loading={register.isPending}
          onPress={submit}
        />
      </View>
      <View style={styles.footer}>
        <AppText variant="bodySm" tone="secondary">
          {t('mobile.auth.signUp.hasAccount')}
        </AppText>
        <Link href="/entrar" replace asChild>
          <Button variant="ghost" label={t('common.actions.signIn')} />
        </Link>
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[1] },
}));
