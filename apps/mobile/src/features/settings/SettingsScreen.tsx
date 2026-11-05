import type { PreferencesUpdateBody } from '@sobra/client';
import { translateError } from '@sobra/i18n';
import { DISPLAY_CURRENCIES, LOCALES, type User } from '@sobra/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthProvider';
import { useServices } from '../../api/ServicesProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { haptics } from '../../lib/haptics';
import { makeStyles } from '../../theme/makeStyles';
import { useThemeContext, type ThemePreference } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Segmented } from '../../ui/Segmented';
import { useToast } from '../../ui/Toast';

/** break-ui scenarios and simulated text size; dropped from release bundles (see app/_layout). */
const DevSettings = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../../dev/DevSettings') as typeof import('../../dev/DevSettings')).DevSettings
  : null;

/**
 * Language and display currency live on the user (ADR-035). The choice applies at once: `me` is
 * replaced in the cache before the request (every screen re-renders in the new language), the
 * response confirms it, and a failure puts the previous preference back and says so.
 */
function usePreferences() {
  const { queries, mutations, queryClient } = useServices();
  const toast = useToast();
  const { t } = useI18n();
  const meKey = queries.me().queryKey;
  const update = useMutation({
    ...mutations.auth.updatePreferences,
    onMutate: async (body: PreferencesUpdateBody) => {
      await queryClient.cancelQueries({ queryKey: meKey });
      const previous = queryClient.getQueryData<User>(meKey);
      if (previous) {
        queryClient.setQueryData<User>(meKey, {
          ...previous,
          locale: body.locale ?? previous.locale,
          currency: body.currency ?? previous.currency,
        });
      }
      return { previous };
    },
    onError: (error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(meKey, context.previous);
      haptics.error();
      toast.show({
        tone: 'error',
        message: t('mobile.settings.preferencesFailed', { error: translateError(t, error) }),
      });
    },
  });
  return (body: PreferencesUpdateBody) => {
    haptics.selection();
    update.mutate(body);
  };
}

export function SettingsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { queries, mutations } = useServices();
  const auth = useAuth();
  const { t, locale, currency } = useI18n();
  const { preference, setPreference } = useThemeContext();
  const me = useQuery(queries.me());
  const logout = useMutation(mutations.auth.logout);
  const updatePreferences = usePreferences();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" accessibilityRole="header">
          {t('nav.settings')}
        </AppText>
        {me.data ? (
          <View style={styles.card}>
            <AppText variant="label">{me.data.name}</AppText>
            <AppText variant="bodySm" tone="secondary">
              {me.data.email}
            </AppText>
          </View>
        ) : null}
        <View style={styles.card}>
          <AppText variant="label" tone="secondary">
            {t('mobile.settings.theme')}
          </AppText>
          <Segmented<ThemePreference>
            label={t('mobile.settings.theme')}
            options={[
              { value: 'system', label: t('mobile.settings.themes.system') },
              { value: 'light', label: t('mobile.settings.themes.light') },
              { value: 'dark', label: t('mobile.settings.themes.dark') },
            ]}
            value={preference}
            onChange={setPreference}
          />
        </View>
        <View style={styles.card} testID="preferences">
          <AppText variant="titleSm" accessibilityRole="header">
            {t('mobile.settings.languageAndCurrency')}
          </AppText>
          <Options label={t('preferences.language')}>
            {LOCALES.map((value) => (
              <Chip
                key={value}
                testID={`locale-${value}`}
                accessibilityRole="radio"
                label={t(`preferences.locales.${value}`)}
                selected={value === locale}
                onPress={() => {
                  if (value !== locale) updatePreferences({ locale: value });
                }}
              />
            ))}
          </Options>
          <Options label={t('preferences.currency')}>
            {DISPLAY_CURRENCIES.map((value) => (
              <Chip
                key={value}
                testID={`currency-${value}`}
                accessibilityRole="radio"
                label={t(`preferences.currencies.${value}`)}
                selected={value === currency}
                onPress={() => {
                  if (value !== currency) updatePreferences({ currency: value });
                }}
              />
            ))}
          </Options>
          <AppText variant="caption" tone="secondary">
            {t('preferences.currencyHint')}
          </AppText>
        </View>
        {DevSettings ? <DevSettings /> : null}
        <Button
          variant="secondary"
          label={t('common.actions.signOut')}
          loading={logout.isPending}
          onPress={() => logout.mutate(undefined, { onSettled: () => auth.markSignedOut() })}
        />
      </ScrollView>
    </View>
  );
}

/** A labelled single-choice group of chips; they wrap at large text sizes. */
function Options({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {children}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg.canvas },
  content: { padding: t.layout.phoneMargin, gap: t.space[4] },
  card: {
    gap: t.space[2],
    padding: t.space[4],
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.bg.surface,
  },
  group: { gap: t.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
