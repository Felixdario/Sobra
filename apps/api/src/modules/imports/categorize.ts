import type { CategoryKind, CategorySystemKey } from '@sobra/shared';
import { normalizeText } from './csv';

/** `name` is the pt-BR default name, matched when the category has no `systemKey`. */
type KeywordRule = {
  kind: CategoryKind;
  systemKey: CategorySystemKey;
  name: string;
  pattern: RegExp;
};

/** Matched against the normalized description (upper case, no accents); first match wins. */
const RULES: readonly KeywordRule[] = [
  {
    kind: 'income',
    systemKey: 'salary',
    name: 'Salário',
    pattern: /\b(SALARIO|PROVENTOS|FOLHA DE PAGAMENTO)\b/,
  },
  {
    kind: 'income',
    systemKey: 'investments',
    name: 'Rendimentos',
    pattern: /\b(RENDIMENTO|JUROS|DIVIDENDO)/,
  },
  { kind: 'income', systemKey: 'freelance', name: 'Freelance', pattern: /\b(FREELA|HONORARIOS)/ },
  {
    kind: 'expense',
    systemKey: 'groceries',
    name: 'Mercado',
    pattern:
      /(MERCADO(?! ?(LIVRE|PAGO))|SUPERMERC|ATACAD|HORTIFRUTI|ASSAI|CARREFOUR|PAO DE ACUCAR)/,
  },
  {
    kind: 'expense',
    systemKey: 'transport',
    name: 'Transporte',
    pattern:
      /(\bUBER\b|^99\b|\b99 ?(APP|POP|TAXI)\b|POSTO|COMBUSTIVEL|ESTACIONAMENTO|METRO\b|BILHETE UNICO)/,
  },
  {
    kind: 'expense',
    systemKey: 'subscriptions',
    name: 'Assinaturas',
    pattern: /(NETFLIX|SPOTIFY|DISNEY|HBO|MAX\.COM|PRIME VIDEO|AMAZON PRIME|YOUTUBE|DEEZER|ICLOUD)/,
  },
  {
    kind: 'expense',
    systemKey: 'restaurants',
    name: 'Restaurantes',
    pattern: /(IFOOD|RESTAURANTE|LANCHONETE|PADARIA|PIZZARIA|BURGER|CAFE\b|BAR\b)/,
  },
  {
    kind: 'expense',
    systemKey: 'health',
    name: 'Saúde',
    pattern: /(FARMACIA|DROGARIA|DROGASIL|DROGA RAIA|HOSPITAL|CLINICA|LABORATORIO|UNIMED)/,
  },
  {
    kind: 'expense',
    systemKey: 'housing',
    name: 'Moradia',
    pattern: /(ALUGUEL|CONDOMINIO|ENERGIA|\bLUZ\b|ENEL|CEMIG|SABESP|AGUA|\bGAS\b|IPTU)/,
  },
  {
    kind: 'expense',
    systemKey: 'education',
    name: 'Educação',
    pattern: /(ESCOLA|FACULDADE|UNIVERSIDADE|CURSO|UDEMY|ALURA|LIVRARIA)/,
  },
  {
    kind: 'expense',
    systemKey: 'leisure',
    name: 'Lazer',
    pattern: /(CINEMA|INGRESSO|TEATRO|SHOW|STEAM|PLAYSTATION)/,
  },
  {
    kind: 'expense',
    systemKey: 'shopping',
    name: 'Compras',
    pattern: /(AMAZON|MERCADO ?LIVRE|SHOPEE|MAGALU|MAGAZINE|RENNER|C&A|RIACHUELO)/,
  },
];

export type CategoryLookup = {
  id: string;
  name: string;
  kind: CategoryKind;
  systemKey?: string | null;
};

/**
 * Category suggested for an imported description by keyword, among the user's categories of the
 * same kind: the default category with the rule's `systemKey` (any language, ADR-035), else one
 * named like the pt-BR default (case and accents ignored); `null` when nothing matches.
 */
export function createCategorySuggester(categories: readonly CategoryLookup[]) {
  const byKey = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const category of categories) {
    if (category.systemKey) byKey.set(`${category.kind}:${category.systemKey}`, category.id);
    byName.set(`${category.kind}:${normalizeText(category.name)}`, category.id);
  }
  return (description: string, kind: CategoryKind): string | null => {
    const text = normalizeText(description);
    for (const rule of RULES) {
      if (rule.kind !== kind || !rule.pattern.test(text)) continue;
      const id =
        byKey.get(`${kind}:${rule.systemKey}`) ?? byName.get(`${kind}:${normalizeText(rule.name)}`);
      if (id) return id;
    }
    return null;
  };
}
