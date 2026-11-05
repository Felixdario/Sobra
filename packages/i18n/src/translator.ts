import {
  DEFAULT_LOCALE,
  matchValidationMessage,
  type CategorySystemKey,
  type Locale,
  type ValidationKey,
} from '@sobra/shared';
import { catalogs, type Catalog, type MessageKey, type SourceMessage } from './catalog';
import type { CatalogTree, ParamValue, PluralCategory, PluralForms, TranslateArgs } from './types';

export interface Translator {
  /** Message for `key` in this translator's locale, with `{placeholders}` filled from `params`. */
  <K extends MessageKey>(key: K, ...args: TranslateArgs<SourceMessage<K>>): string;
  readonly locale: Locale;
  /** For keys built at runtime (an error code from the server): is it in the catalog? */
  has(key: string): key is MessageKey;
}

type Message = string | PluralForms;

const PLURAL_CATEGORIES: readonly string[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/** Same rule as the `IsPlural` type: every key is a plural category and `other` is there. */
function isPlural(node: unknown): node is PluralForms {
  if (typeof node !== 'object' || node === null || !('other' in node)) return false;
  return Object.entries(node).every(
    ([key, value]) => PLURAL_CATEGORIES.includes(key) && typeof value === 'string',
  );
}

function lookup(catalog: Catalog, key: string): Message | undefined {
  let node: unknown = catalog;
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null || isPlural(node)) return undefined;
    node = (node as CatalogTree)[segment];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

/**
 * CLDR rule for an integer count when `Intl.PluralRules` is missing (old JS engines). Hermes in
 * Expo SDK 58 ships it; this only keeps a broken runtime from throwing.
 */
function fallbackCategory(locale: Locale, count: number): PluralCategory {
  const integer = Math.floor(Math.abs(count));
  if (locale === 'pt-BR') return integer === 0 || integer === 1 ? 'one' : 'other';
  return count === 1 ? 'one' : 'other';
}

function pluralSelector(locale: Locale): (count: number) => PluralCategory {
  if (typeof Intl === 'undefined' || typeof Intl.PluralRules !== 'function') {
    return (count) => fallbackCategory(locale, count);
  }
  const rules = new Intl.PluralRules(locale);
  return (count) => rules.select(count);
}

const PLACEHOLDER = /\{(\w+)\}/g;

function createUncached(locale: Locale): Translator {
  const catalog = catalogs[locale];
  const source = catalogs[DEFAULT_LOCALE];
  const selectPlural = pluralSelector(locale);
  const numbers = new Intl.NumberFormat(locale);

  const interpolate = (template: string, params: Record<string, ParamValue> | undefined) =>
    params === undefined
      ? template
      : template.replace(PLACEHOLDER, (match, name: string) => {
          const value = params[name];
          if (value === undefined) return match;
          return typeof value === 'number' ? numbers.format(value) : value;
        });

  const translate = (key: string, params?: Record<string, ParamValue>): string => {
    // The types make a missing key impossible; at runtime fall back to pt-BR, then to the key.
    const message = lookup(catalog, key) ?? lookup(source, key);
    if (message === undefined) return key;
    if (typeof message === 'string') return interpolate(message, params);
    const count = Number(params?.['count'] ?? 0);
    const form =
      count === 0 && message.zero !== undefined
        ? message.zero
        : (message[selectPlural(count)] ?? message.other);
    return interpolate(form, params);
  };

  return Object.assign(translate as Translator, {
    locale,
    has: (key: string): key is MessageKey => lookup(catalog, key) !== undefined,
  });
}

const translators = new Map<Locale, Translator>();

/** Translator for `locale`, created once per locale. Pure TS: same behavior on web and React Native. */
export function createTranslator(locale: Locale): Translator {
  let translator = translators.get(locale);
  if (!translator) {
    translator = createUncached(locale);
    translators.set(locale, translator);
  }
  return translator;
}

/**
 * Message for an error in the user's language: the catalog's `errors.<code>` when the code is
 * known, else the server's message (pt-BR) when there is one, else a generic text. Accepts an
 * `ApiError` from @sobra/client or anything with `code`/`message`.
 */
export function translateError(t: Translator, error: unknown): string {
  const { code, message } =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : {};
  if (typeof code === 'string') {
    const key = `errors.${code}`;
    if (t.has(key)) return t(key as 'errors.unknown');
  }
  if (typeof message === 'string' && message.trim() !== '') return message;
  return t('errors.unknown');
}

/**
 * Name to show for a category: the translated default name while it still has its `systemKey`
 * (the user never renamed it), otherwise the name the user typed.
 */
export function categoryName(
  t: Translator,
  category: { name: string; systemKey?: CategorySystemKey | null | undefined },
): string {
  return category.systemKey ? t(`categories.default.${category.systemKey}`) : category.name;
}

/**
 * The parts of a Zod issue (or of a react-hook-form `FieldError`, whose `type` is the issue code)
 * that translation needs. Extra fields are ignored.
 */
export interface ValidationIssueLike {
  message?: string | undefined;
  code?: string | undefined;
  /** react-hook-form puts the Zod issue code here. */
  type?: string | number | undefined;
  minimum?: unknown;
  maximum?: unknown;
  origin?: string | undefined;
}

/**
 * Catalog key and params of an issue raised by a schema of @sobra/shared (its message comes from
 * the `VALIDATION_MESSAGES` registry), or `null` for anything else.
 */
export function resolveIssue(
  issue: ValidationIssueLike,
): { key: `validation.${ValidationKey}`; params: Record<string, ParamValue> } | null {
  const match = issue.message ? matchValidationMessage(issue.message) : null;
  return match && { key: `validation.${match.key}`, params: match.params };
}

const toNumber = (value: unknown) =>
  typeof value === 'number' || typeof value === 'bigint' ? Number(value) : undefined;

/** Zod's own issues (schemas without a custom message), by code. */
function genericIssue(t: Translator, issue: ValidationIssueLike): string | null {
  const code = issue.code ?? (typeof issue.type === 'string' ? issue.type : undefined);
  const min = toNumber(issue.minimum);
  const max = toNumber(issue.maximum);
  switch (code) {
    case 'invalid_type':
    case 'invalid_value':
    case 'invalid_format':
    case 'invalid_union':
    case 'not_multiple_of':
      return t('validation.generic.invalid');
    case 'too_small':
      if (issue.origin === 'string' && min === 1) return t('validation.generic.required');
      return min === undefined
        ? t('validation.generic.invalid')
        : t('validation.generic.tooSmall', { min });
    case 'too_big':
      return max === undefined
        ? t('validation.generic.invalid')
        : t('validation.generic.tooLarge', { max });
    default:
      return null;
  }
}

/**
 * Validation message in the user's language. Issues from the shared schemas map to
 * `validation.<key>` (with params such as `{max}`). Zod's own messages stay as they are in pt-BR
 * (they come from `installZodPtBR`) and become `validation.generic.*` in other languages. Anything
 * else falls back to the original message.
 */
export function translateIssue(t: Translator, issue: ValidationIssueLike): string {
  const resolved = resolveIssue(issue);
  if (resolved) {
    const translate = t as (key: string, params?: Record<string, ParamValue>) => string;
    return translate(resolved.key, resolved.params);
  }
  if (t.locale !== DEFAULT_LOCALE) {
    const generic = genericIssue(t, issue);
    if (generic) return generic;
  }
  return issue.message ?? t('validation.generic.invalid');
}

/**
 * For react-hook-form + zodResolver (web and React Native alike):
 * `translateFieldError(t, errors.email)` → translated text, or `undefined` when there is no error.
 */
export function translateFieldError(
  t: Translator,
  error: ValidationIssueLike | undefined | null,
): string | undefined {
  return error ? translateIssue(t, error) : undefined;
}
