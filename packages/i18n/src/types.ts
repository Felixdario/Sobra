/**
 * `Intl.PluralRules` categories. `zero` is also used as an *exact zero* override: when the count
 * is 0 and the message has `zero`, it wins over the locale's rule ("Nenhuma transação" instead of
 * CLDR's "0 transação" in pt-BR).
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** A plural message: `other` is required, every other category is optional. */
export type PluralForms = { readonly other: string } & {
  readonly [C in Exclude<PluralCategory, 'other'>]?: string;
};

/**
 * A plural message is an object whose keys are *all* plural categories, with `other`. Checking
 * every key (not just the presence of `other`) keeps a namespace that happens to have an `other`
 * entry (`categories.default.other`) from being read as a plural.
 */
export type IsPlural<T> = T extends { readonly other: string }
  ? [Exclude<keyof T, PluralCategory>] extends [never]
    ? true
    : false
  : false;

/** Namespaces nest; leaves are strings or plural messages. */
export interface CatalogTree {
  readonly [key: string]: string | PluralForms | CatalogTree;
}

/**
 * The shape every locale must have, derived from the source catalog (pt-BR): same keys at every
 * level, strings widened to `string` and plural messages to `PluralForms` (each language keeps the
 * categories it needs).
 */
export type Widen<T> = T extends string
  ? string
  : IsPlural<T> extends true
    ? PluralForms
    : { readonly [K in keyof T]: Widen<T[K]> };

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

/** Dot paths to every message of a catalog: "common.actions.save", "counts.transactions". */
export type MessageKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? Join<P, K>
    : IsPlural<T[K]> extends true
      ? Join<P, K>
      : MessageKeys<T[K], Join<P, K>>;
}[keyof T & string];

/** The message at a dot path. */
export type MessageAt<T, K extends string> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? MessageAt<T[Head], Rest>
    : never
  : K extends keyof T
    ? T[K]
    : never;

type Placeholders<S> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

/** `{name}` placeholders of a message; plural messages always take `count`. */
export type PlaceholdersOf<M> = M extends string
  ? Placeholders<M>
  : IsPlural<M> extends true
    ? Placeholders<M[keyof M]> | 'count'
    : never;

export type ParamValue = string | number;

/** Arguments after the key: none for plain messages, the placeholders (typed) otherwise. */
export type TranslateArgs<M> = [PlaceholdersOf<M>] extends [never]
  ? [params?: undefined]
  : [params: { readonly [P in PlaceholdersOf<M>]: P extends 'count' ? number : ParamValue }];
