import { queryKeys } from '@sobra/client/query';
import { DEFAULT_CURRENCY, type User } from '@sobra/shared';
import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useServices } from '../lib/servicesContext';
import { browserLocale, subscribeToLanguages } from './browserLocale';
import { createI18n } from './createI18n';
import { I18nContext } from './i18nContext';

/**
 * Language and display currency come from `me` (ADR-035), so the cache is the single source:
 * the preferences mutation replaces `me` and every screen re-renders in the new language at once,
 * with no reload. It reads the cache instead of observing a query: nothing is fetched here
 * (ProtectedRoute and the sign-in mutations fill `me`), and sign-in and sign-out call
 * `removeQueries()`, which would leave a query observer bound to the removed entry. Signed out,
 * the browser's language and the default currency apply.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { queryClient } = useServices();
  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange),
    [queryClient],
  );
  const readMe = useCallback(() => queryClient.getQueryData<User>(queryKeys.me()), [queryClient]);
  const me = useSyncExternalStore(subscribe, readMe, readMe);
  const fromBrowser = useSyncExternalStore(subscribeToLanguages, browserLocale, browserLocale);
  const locale = me?.locale ?? fromBrowser;
  const currency = me?.currency ?? DEFAULT_CURRENCY;

  const value = useMemo(() => createI18n(locale, currency), [locale, currency]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', value.t('web.app.description'));
  }, [locale, value]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
