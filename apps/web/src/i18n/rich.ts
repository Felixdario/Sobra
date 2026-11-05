import type { MessageKey, SourceCatalog, TranslateArgs, Translator } from '@sobra/i18n';
import { createElement, Fragment, isValidElement, type ReactNode } from 'react';

type At<T, K extends string> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? At<T[Head], Rest>
    : never
  : K extends keyof T
    ? T[K]
    : never;

/** The message's placeholders, where each may also be a React element (a link, a `.num` span). */
export type RichParams<K extends MessageKey> =
  TranslateArgs<At<SourceCatalog, K>> extends [params: infer P]
    ? { readonly [Q in keyof NonNullable<P>]: NonNullable<P>[Q] | ReactNode }
    : never;

const OPEN = '\u0001';
const CLOSE = '\u0002';
const MARKER = new RegExp(`${OPEN}(\\w+)${CLOSE}`, 'g');

/**
 * A whole translated sentence with elements in place of some placeholders, so the word order
 * stays the catalog's ("Ainda não tem conta? <Link>"). Strings and numbers are interpolated by
 * `t` (plural `count` included); elements go through a marker and are put back in order.
 */
export function richText<K extends MessageKey>(
  t: Translator,
  key: K,
  params: RichParams<K>,
): ReactNode {
  const values: Record<string, string | number> = {};
  const nodes: Record<string, ReactNode> = {};
  for (const [name, value] of Object.entries(params as Record<string, unknown>)) {
    if (typeof value === 'string' || typeof value === 'number') values[name] = value;
    else {
      nodes[name] = value as ReactNode;
      values[name] = `${OPEN}${name}${CLOSE}`;
    }
  }
  const text = (t as (key: string, params?: Record<string, string | number>) => string)(
    key,
    values,
  );
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const node = nodes[match[1] ?? ''];
    parts.push(isValidElement(node) ? node : (node ?? ''));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return createElement(Fragment, null, ...parts);
}
