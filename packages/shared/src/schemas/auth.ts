import { z } from 'zod';
import { validationMessage } from './messages';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../config';
import { idSchema, isoDateTimeSchema, nameSchema } from './common';
import { deviceLocaleSchema, displayCurrencySchema, localeSchema } from './preferences';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const emailSchema = z
  .string({ error: validationMessage('auth.emailRequired') })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: validationMessage('auth.emailInvalid') }));

export const passwordSchema = z
  .string({ error: validationMessage('auth.passwordRequired') })
  .min(PASSWORD_MIN, { error: validationMessage('auth.passwordTooShort', { min: PASSWORD_MIN }) })
  .max(PASSWORD_MAX, { error: validationMessage('auth.passwordTooLong', { max: PASSWORD_MAX }) });

export const registerSchema = z.object({
  name: nameSchema(80),
  email: emailSchema,
  password: passwordSchema,
  /** Browser/device language (optional); picks the interface language and default names. */
  locale: deviceLocaleSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: validationMessage('auth.passwordRequired') })
    .min(1, { error: validationMessage('auth.passwordRequired') }),
});

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.int().positive(),
});

/**
 * Tokens for a cookie session (web, ADR-034): the refresh token travels only in an httpOnly
 * cookie, so the body carries just the access token.
 */
export const cookieTokensSchema = tokenPairSchema.omit({ refreshToken: true });

export const refreshSchema = z.object({
  refreshToken: z.string({ error: validationMessage('auth.refreshTokenMissing') }).min(1, {
    error: validationMessage('auth.refreshTokenMissing'),
  }),
});

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.email(),
  /**
   * Preferences (ADR-035). The defaults only let a newer client read an older API; the API always
   * sends both.
   */
  locale: localeSchema.default(DEFAULT_LOCALE),
  currency: displayCurrencySchema.default(DEFAULT_CURRENCY),
  createdAt: isoDateTimeSchema,
});

export const authResponseSchema = z.object({
  user: userSchema,
  tokens: tokenPairSchema,
});

export const cookieAuthResponseSchema = z.object({
  user: userSchema,
  tokens: cookieTokensSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type CookieTokens = z.infer<typeof cookieTokensSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type CookieAuthResponse = z.infer<typeof cookieAuthResponseSchema>;
