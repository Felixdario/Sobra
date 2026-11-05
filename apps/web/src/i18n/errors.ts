import { isApiError } from '@sobra/client';
import {
  resolveIssue,
  translateError,
  translateIssue,
  type MessageKey,
  type Translator,
} from '@sobra/i18n';
import { DEFAULT_LOCALE } from '@sobra/shared';

/** Screen-specific texts by `ApiError.code` (401 on the login is "wrong password"). */
export type ErrorOverrides = Partial<Record<string, MessageKey>>;

/**
 * What to tell the person about a failed request (ADR-035):
 * 1. in pt-BR, the message itself: the API's domain messages (and the client's own) are pt-BR and
 *    more specific than any generic text ("Já existe uma categoria de despesa com esse nome");
 * 2. a screen-specific key for the error's code, when the screen gave one;
 * 3. the first `VALIDATION_ERROR` detail that maps to a catalog key, then `translateError`
 *    (`errors.<code>`, the server message as a last resort).
 */
export function errorText(t: Translator, error: unknown, overrides: ErrorOverrides = {}): string {
  if (t.locale === DEFAULT_LOCALE && error instanceof Error && error.message.trim()) {
    return error.message;
  }
  const code = isApiError(error) ? error.code : undefined;
  const override = code ? overrides[code] : undefined;
  if (override) return (t as unknown as (key: string) => string)(override);
  if (isApiError(error) && code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    const issue = (error.details as unknown[]).find(
      (detail): detail is { message: string } =>
        typeof detail === 'object' &&
        detail !== null &&
        typeof (detail as { message?: unknown }).message === 'string' &&
        resolveIssue(detail as { message: string }) !== null,
    );
    if (issue) return translateIssue(t, issue);
  }
  return translateError(t, error);
}
