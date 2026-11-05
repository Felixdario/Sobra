import { createTranslator } from '@sobra/i18n';
import type { DisplayCurrency, Locale } from '@sobra/shared';
import { errorText } from './errors';
import { createFormat } from './format';
import type { I18n } from './i18nContext';
import { richText } from './rich';

/** Everything a screen needs to speak the person's language, for one locale and currency. */
export function createI18n(locale: Locale, currency: DisplayCurrency): I18n {
  const t = createTranslator(locale);
  return {
    locale,
    currency,
    t,
    fmt: createFormat(locale, currency),
    rich: (key, params) => richText(t, key, params),
    errorText: (error, overrides) => errorText(t, error, overrides),
  };
}
