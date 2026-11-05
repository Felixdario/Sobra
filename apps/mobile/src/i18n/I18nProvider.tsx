import {
  DEFAULT_CURRENCY,
  isDisplayCurrency,
  isLocale,
  resolveLocale,
  type DisplayCurrency,
  type Locale,
} from '@sobra/shared';
import { useQuery } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../api/AuthProvider';
import { useServices } from '../api/ServicesProvider';
import { storage } from '../lib/storage';
import { createI18n, type I18n } from './format';

/** The last preference seen, so an offline start (no `me` yet) keeps the person's language. */
const PREFERENCES_KEY = 'sobra.preferences';

type Preferences = { locale: Locale; currency: DisplayCurrency };

/** The device's language before sign-in ("en-GB" → en-US, "fr" → pt-BR). */
export function deviceLocale(): Locale {
  try {
    return resolveLocale(getLocales().map((locale) => locale.languageTag));
  } catch {
    return resolveLocale(null);
  }
}

function parseStored(raw: string | null | undefined): Preferences | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    return isLocale(value.locale) && isDisplayCurrency(value.currency)
      ? { locale: value.locale, currency: value.currency }
      : null;
  } catch {
    return null;
  }
}

const I18nContext = createContext<I18n | null>(null);

/**
 * Language and display currency for the whole app: the signed-in user's preference (`me`), else
 * the last one stored on this device, else the device language with BRL. A preference change
 * replaces `me` in the query cache, so every screen re-renders in the new language at once.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { queries } = useServices();
  const { status } = useAuth();
  const me = useQuery({ ...queries.me(), enabled: status === 'signedIn' });
  const [stored, setStored] = useState<Preferences | null>(null);
  const [device] = useState(deviceLocale);

  useEffect(() => {
    let active = true;
    Promise.resolve(storage.get(PREFERENCES_KEY))
      .then((raw) => {
        if (active) setStored(parseStored(raw));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const user = status === 'signedIn' ? me.data : undefined;
  const locale = user?.locale ?? stored?.locale ?? device;
  const currency = user?.currency ?? stored?.currency ?? DEFAULT_CURRENCY;

  useEffect(() => {
    if (!user) return;
    const next = { locale: user.locale, currency: user.currency };
    // Kept for after sign-out or an offline start; the live value comes from `me` meanwhile.
    Promise.resolve(storage.set(PREFERENCES_KEY, JSON.stringify(next)))
      .then(() => setStored(next))
      .catch(() => {});
  }, [user]);

  return <I18nContext value={createI18n(locale, currency)}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n needs <I18nProvider>');
  return value;
}
