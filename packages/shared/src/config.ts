export const APP_NAME = 'Sobra';

/** Interface languages (ADR-035). pt-BR is the source language and the default. */
export const LOCALES = ['pt-BR', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

/**
 * Currencies the user can pick to *display* amounts (ADR-035). Amounts are always integer cents
 * of the currency the person records in; there is no exchange-rate conversion. All have 2 decimals.
 */
export const DISPLAY_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
export const DEFAULT_CURRENCY: DisplayCurrency = 'BRL';

/** Calendar days and months are always taken in São Paulo (ADR-007); per-user zones are future work. */
export const TIME_ZONE = 'America/Sao_Paulo';

/** @deprecated Use `DEFAULT_LOCALE` or the user's `locale` preference. */
export const LOCALE: Locale = DEFAULT_LOCALE;
/** @deprecated Use `DEFAULT_CURRENCY` or the user's `currency` preference. */
export const CURRENCY: DisplayCurrency = DEFAULT_CURRENCY;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === 'string' && (DISPLAY_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Best supported locale for a browser or device language tag (`navigator.languages`,
 * `expo-localization`): "en-GB" → "en-US", "pt-PT" → "pt-BR"; anything else → `DEFAULT_LOCALE`.
 * Takes the first tag that matches by language.
 */
export function resolveLocale(
  tags: string | readonly (string | null | undefined)[] | null | undefined,
): Locale {
  const list = typeof tags === 'string' ? [tags] : (tags ?? []);
  for (const tag of list) {
    if (!tag) continue;
    const normalized = tag.trim().replace('_', '-').toLowerCase();
    const exact = LOCALES.find((locale) => locale.toLowerCase() === normalized);
    if (exact) return exact;
    const language = normalized.split('-')[0];
    const byLanguage = LOCALES.find((locale) => locale.split('-')[0] === language);
    if (byLanguage) return byLanguage;
  }
  return DEFAULT_LOCALE;
}
