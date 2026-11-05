export { catalogs, type Catalog, type MessageKey, type SourceCatalog } from './catalog';
export { enUS } from './locales/en-US';
export { ptBR } from './locales/pt-BR';
export {
  categoryName,
  createTranslator,
  resolveIssue,
  translateError,
  translateFieldError,
  translateIssue,
  type Translator,
  type ValidationIssueLike,
} from './translator';
export type { ParamValue, PluralCategory, PluralForms, TranslateArgs } from './types';
export { LOCALES, DEFAULT_LOCALE, resolveLocale, type Locale } from '@sobra/shared';
