import type { CategoryKind } from '@financas/shared';
import { normalizeText } from './csv';

type KeywordRule = { kind: CategoryKind; category: string; pattern: RegExp };

/** Matched against the normalized description (upper case, no accents); first match wins. */
const RULES: readonly KeywordRule[] = [
  { kind: 'income', category: 'Salário', pattern: /\b(SALARIO|PROVENTOS|FOLHA DE PAGAMENTO)\b/ },
  { kind: 'income', category: 'Rendimentos', pattern: /\b(RENDIMENTO|JUROS|DIVIDENDO)/ },
  { kind: 'income', category: 'Freelance', pattern: /\b(FREELA|HONORARIOS)/ },
  {
    kind: 'expense',
    category: 'Mercado',
    pattern:
      /(MERCADO(?! ?(LIVRE|PAGO))|SUPERMERC|ATACAD|HORTIFRUTI|ASSAI|CARREFOUR|PAO DE ACUCAR)/,
  },
  {
    kind: 'expense',
    category: 'Transporte',
    pattern:
      /(\bUBER\b|^99\b|\b99 ?(APP|POP|TAXI)\b|POSTO|COMBUSTIVEL|ESTACIONAMENTO|METRO\b|BILHETE UNICO)/,
  },
  {
    kind: 'expense',
    category: 'Assinaturas',
    pattern: /(NETFLIX|SPOTIFY|DISNEY|HBO|MAX\.COM|PRIME VIDEO|AMAZON PRIME|YOUTUBE|DEEZER|ICLOUD)/,
  },
  {
    kind: 'expense',
    category: 'Restaurantes',
    pattern: /(IFOOD|RESTAURANTE|LANCHONETE|PADARIA|PIZZARIA|BURGER|CAFE\b|BAR\b)/,
  },
  {
    kind: 'expense',
    category: 'Saúde',
    pattern: /(FARMACIA|DROGARIA|DROGASIL|DROGA RAIA|HOSPITAL|CLINICA|LABORATORIO|UNIMED)/,
  },
  {
    kind: 'expense',
    category: 'Moradia',
    pattern: /(ALUGUEL|CONDOMINIO|ENERGIA|\bLUZ\b|ENEL|CEMIG|SABESP|AGUA|\bGAS\b|IPTU)/,
  },
  {
    kind: 'expense',
    category: 'Educação',
    pattern: /(ESCOLA|FACULDADE|UNIVERSIDADE|CURSO|UDEMY|ALURA|LIVRARIA)/,
  },
  {
    kind: 'expense',
    category: 'Lazer',
    pattern: /(CINEMA|INGRESSO|TEATRO|SHOW|STEAM|PLAYSTATION)/,
  },
  {
    kind: 'expense',
    category: 'Compras',
    pattern: /(AMAZON|MERCADO ?LIVRE|SHOPEE|MAGALU|MAGAZINE|RENNER|C&A|RIACHUELO)/,
  },
];

export type CategoryLookup = { id: string; name: string; kind: CategoryKind };

/**
 * Category suggested for an imported description by keyword, among the user's categories with
 * the same name (case and accents ignored) and kind; `null` when nothing matches.
 */
export function createCategorySuggester(categories: readonly CategoryLookup[]) {
  const byName = new Map(
    categories.map((category) => [`${category.kind}:${normalizeText(category.name)}`, category.id]),
  );
  return (description: string, kind: CategoryKind): string | null => {
    const text = normalizeText(description);
    for (const rule of RULES) {
      if (rule.kind !== kind || !rule.pattern.test(text)) continue;
      const id = byName.get(`${kind}:${normalizeText(rule.category)}`);
      if (id) return id;
    }
    return null;
  };
}
