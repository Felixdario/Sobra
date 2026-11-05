import { z } from 'zod';
import { validationMessage } from './messages';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DISPLAY_CURRENCIES,
  LOCALES,
  resolveLocale,
} from '../config';

export const localeSchema = z.enum(LOCALES, {
  error: validationMessage('preferences.localeInvalid'),
});

export const displayCurrencySchema = z.enum(DISPLAY_CURRENCIES, {
  error: validationMessage('preferences.currencyInvalid'),
});

/**
 * What the user picked for the interface (ADR-035). `currency` only changes how amounts are
 * *displayed*: they stay integer cents of the currency the person records in, with no conversion.
 */
export const userPreferencesSchema = z.object({
  locale: localeSchema,
  currency: displayCurrencySchema,
});

export const DEFAULT_PREFERENCES: UserPreferences = {
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
};

/** `PATCH /me/preferences`: any subset, at least one field. */
export const userPreferencesUpdateSchema = userPreferencesSchema
  .partial()
  .refine((value) => value.locale !== undefined || value.currency !== undefined, {
    error: validationMessage('common.updateEmpty'),
  });

/**
 * Language sent at sign-up: whatever the browser or device reports ("en-GB", "pt"), resolved to a
 * supported locale with `resolveLocale` instead of being rejected, so a device setting never
 * blocks a registration.
 */
export const deviceLocaleSchema = z
  .string({ error: validationMessage('preferences.localeTagInvalid') })
  .max(35, { error: validationMessage('preferences.localeTagInvalid') })
  .transform((tag) => resolveLocale(tag));

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferencesUpdate = z.infer<typeof userPreferencesUpdateSchema>;
