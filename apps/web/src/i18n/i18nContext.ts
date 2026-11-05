import type { MessageKey, Translator } from '@sobra/i18n';
import type { DisplayCurrency, Locale } from '@sobra/shared';
import { createContext, use, type ReactNode } from 'react';
import type { ErrorOverrides } from './errors';
import type { Format } from './format';
import type { RichParams } from './rich';

export type I18n = {
  locale: Locale;
  currency: DisplayCurrency;
  t: Translator;
  /** Money, dates and numbers already bound to the person's locale and display currency. */
  fmt: Format;
  /** A translated sentence with elements (links, `.num` spans) in place of placeholders. */
  rich: <K extends MessageKey>(key: K, params: RichParams<K>) => ReactNode;
  /** A failed request in the person's language (see `errorText`). */
  errorText: (error: unknown, overrides?: ErrorOverrides) => string;
};

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n precisa de <I18nProvider>');
  return value;
}
