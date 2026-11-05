import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES, DEFAULT_CATEGORY_KEYS, LOCALES } from '@sobra/shared';
import { catalogs } from './catalog';
import { enUS } from './locales/en-US';
import { ptBR } from './locales/pt-BR';
import type { Catalog } from './catalog';

type Node = string | { readonly [key: string]: Node };

const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const isPlural = (node: object) => 'other' in node && Object.keys(node).every((k) => PLURAL.has(k));

/** Every message as "path" (plural messages as one entry), with its placeholders. */
function messages(tree: Node, prefix = ''): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (typeof tree === 'string') return out;
  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof node === 'string' || isPlural(node)) {
      const texts =
        typeof node === 'string' ? [node] : Object.values(node as Record<string, string>);
      const names = new Set(
        texts.flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])),
      );
      if (typeof node !== 'string') names.add('count');
      out.set(path, [...names].sort() as string[]);
    } else {
      for (const [childPath, names] of messages(node, path)) out.set(childPath, names);
    }
  }
  return out;
}

describe('catálogos', () => {
  const source = messages(ptBR as Node);

  it('existe um catálogo por locale suportado', () => {
    expect(Object.keys(catalogs).sort()).toEqual([...LOCALES].sort());
  });

  it('en-US tem exatamente as chaves de pt-BR', () => {
    expect([...messages(enUS as Node).keys()].sort()).toEqual([...source.keys()].sort());
  });

  it('en-US usa os mesmos placeholders de pt-BR em cada mensagem', () => {
    const english = messages(enUS as Node);
    for (const [key, names] of source) expect([key, english.get(key)]).toEqual([key, names]);
  });

  it('nenhuma mensagem é vazia', () => {
    const texts = (tree: Node): string[] =>
      typeof tree === 'string' ? [tree] : Object.values(tree).flatMap(texts);
    for (const catalog of Object.values(catalogs)) {
      for (const text of texts(catalog as Node)) expect(text.trim()).not.toBe('');
    }
  });

  it('cobre as categorias padrão do contrato e todos os códigos de erro da API', () => {
    for (const catalog of Object.values(catalogs)) {
      expect(Object.keys(catalog.categories.default).sort()).toEqual(
        [...DEFAULT_CATEGORY_KEYS].sort(),
      );
      for (const code of API_ERROR_CODES) expect(catalog.errors).toHaveProperty(code);
    }
  });

  it('o tipo Catalog recusa chave faltando ou sobrando', () => {
    // @ts-expect-error `nav` must be the full namespace
    const missing: Catalog = { ...enUS, nav: undefined };
    // @ts-expect-error `extra` is not a key of the source catalog
    const extra: Catalog = { ...enUS, nav: { ...enUS.nav, extra: 'Extra' } };
    expect([missing, extra]).toHaveLength(2);
  });
});
