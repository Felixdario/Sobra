import type { Locale } from '@sobra/shared';
import { enUS } from './locales/en-US';
import { ptBR } from './locales/pt-BR';
import type { MessageAt, MessageKeys, Widen } from './types';

/** pt-BR is the source: its literal types drive keys and placeholders. */
export type SourceCatalog = typeof ptBR;

/** What every locale must look like: exactly the source's keys. */
export type Catalog = Widen<SourceCatalog>;

/** Every translatable key: "common.actions.save", "categories.default.groceries"… */
export type MessageKey = MessageKeys<SourceCatalog>;

export type SourceMessage<K extends MessageKey> = MessageAt<SourceCatalog, K>;

export const catalogs: Readonly<Record<Locale, Catalog>> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};
