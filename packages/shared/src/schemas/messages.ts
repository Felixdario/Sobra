/**
 * Every custom validation message of the contract, by stable key (ADR-035). Schemas build their
 * pt-BR text with `validationMessage(key, params)`, so the API keeps answering readable pt-BR, and
 * clients recover the key from the text (`matchValidationMessage`) to show it in the user's
 * language (`translateIssue` in @sobra/i18n, catalog `validation.<key>`).
 *
 * `{name}` placeholders are filled from `params`. Two keys must never produce the same text.
 */
export const VALIDATION_MESSAGES = {
  'common.idInvalid': 'Identificador inválido',
  'common.updateEmpty': 'Informe ao menos um campo para atualizar',
  'common.colorInvalid': 'Cor inválida: use o formato #RRGGBB',
  'common.iconInvalid': 'Ícone inválido',
  'common.monthInvalid': 'Mês inválido: use o formato AAAA-MM',
  'common.dateInvalid': 'Data inválida: use o formato AAAA-MM-DD com uma data existente',
  'common.dateTimeInvalid': 'Data e hora inválidas',
  'amount.notInteger': 'O valor deve ser um número inteiro de centavos',
  'amount.notPositive': 'O valor deve ser maior que zero',
  'name.required': 'Informe o nome',
  'name.tooLong': 'O nome deve ter no máximo {max} caracteres',
  'pagination.pageInvalid': 'Página inválida',
  'pagination.pageTooSmall': 'A página deve ser no mínimo 1',
  'pagination.pageSizeInvalid': 'Tamanho de página inválido',
  'pagination.pageSizeTooSmall': 'O tamanho da página deve ser no mínimo 1',
  'pagination.pageSizeTooLarge': 'O tamanho da página deve ser no máximo {max}',
  'sort.directionInvalid': 'Direção de ordenação inválida: use asc ou desc',
  'sort.fieldInvalid': 'Campo de ordenação inválido',

  'auth.emailRequired': 'Informe o e-mail',
  'auth.emailInvalid': 'E-mail inválido',
  'auth.passwordRequired': 'Informe a senha',
  'auth.passwordTooShort': 'A senha deve ter no mínimo {min} caracteres',
  'auth.passwordTooLong': 'A senha deve ter no máximo {max} caracteres',
  'auth.refreshTokenMissing': 'Token de renovação ausente',

  'preferences.localeInvalid': 'Idioma inválido: use pt-BR ou en-US',
  'preferences.localeTagInvalid': 'Idioma inválido',
  'preferences.currencyInvalid': 'Moeda inválida: use BRL, USD ou EUR',

  'account.typeInvalid': 'Tipo de conta inválido',
  'account.archivedInvalid': 'O campo arquivada deve ser verdadeiro ou falso',

  'category.kindInvalid': 'Tipo de categoria inválido: use receita (income) ou despesa (expense)',
  'category.required': 'Informe uma categoria válida',

  'transaction.typeInvalid': 'Tipo de transação inválido',
  'transaction.typeInvalidHint': 'Tipo de transação inválido: use income, expense ou transfer',
  'transaction.descriptionRequired': 'Informe a descrição',
  'transaction.descriptionTooLong': 'A descrição deve ter no máximo {max} caracteres',
  'transaction.notesInvalid': 'As observações devem ser um texto',
  'transaction.notesTooLong': 'As observações devem ter no máximo {max} caracteres',
  'transaction.toAccountRequired': 'Informe uma conta de destino válida',
  'transaction.sameAccount': 'A conta de destino deve ser diferente da conta de origem',

  'recurring.ruleRequired': 'Informe a regra de recorrência',
  'recurring.frequencyInvalid': 'Frequência inválida: use weekly, monthly ou yearly',
  'recurring.intervalNotInteger': 'O intervalo deve ser um número inteiro',
  'recurring.intervalTooSmall': 'O intervalo deve ser no mínimo 1',
  'recurring.intervalTooLarge': 'O intervalo deve ser no máximo {max}',
  'recurring.dayOfMonthNotInteger': 'O dia do mês deve ser um número inteiro',
  'recurring.dayOfMonthOutOfRange': 'O dia do mês deve estar entre 1 e 31',
  'recurring.endBeforeStart': 'A data final deve ser igual ou posterior à data inicial',
  'recurring.dayOfMonthWeekly': 'O dia do mês não se aplica à recorrência semanal',
  'recurring.activeInvalid': 'O campo ativa deve ser verdadeiro ou falso',

  'csv.columnMissing': 'Coluna {column} ausente',
  'csv.columnTooLong': 'Coluna {column} longa demais',
  'csv.noRows': 'O arquivo não tem linhas para importar',
  'csv.tooManyRows': 'O arquivo deve ter no máximo {max} linhas',
  'csv.contentMissing': 'Envie o conteúdo do arquivo CSV',
  'csv.empty': 'O arquivo está vazio',
  'csv.tooLarge': 'O arquivo é grande demais',
  'csv.typeInvalid': 'Tipo inválido: use income ou expense',
  'csv.requestInvalid': 'Envie o conteúdo do arquivo CSV ou as linhas já separadas',
  'csv.fileNameInvalid': 'Nome de arquivo inválido',
  'csv.forceInvalid': 'O campo force deve ser verdadeiro ou falso',

  'summary.granularityInvalid': 'Granularidade inválida',
  'summary.rangeInvalid': 'O mês inicial deve ser igual ou anterior ao mês final',
} as const;

export type ValidationKey = keyof typeof VALIDATION_MESSAGES;
export const VALIDATION_KEYS = Object.keys(VALIDATION_MESSAGES) as ValidationKey[];

type Placeholders<S> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

/** Placeholders of a key's message: `{ max: number }` for "name.tooLong", nothing for most. */
export type ValidationParams<K extends ValidationKey> = {
  readonly [P in Placeholders<(typeof VALIDATION_MESSAGES)[K]>]: string | number;
};

type ParamsArg<K extends ValidationKey> = [Placeholders<(typeof VALIDATION_MESSAGES)[K]>] extends [
  never,
]
  ? []
  : [params: ValidationParams<K>];

const PLACEHOLDER = /\{(\w+)\}/g;

/** pt-BR text of a validation message, as the schemas and the API use it. */
export function validationMessage<K extends ValidationKey>(
  key: K,
  ...[params]: ParamsArg<K>
): string {
  const template: string = VALIDATION_MESSAGES[key];
  if (!params) return template;
  const values: Record<string, string | number> = params;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    values[name] === undefined ? match : String(values[name]),
  );
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATCHERS = VALIDATION_KEYS.map((key) => {
  const template: string = VALIDATION_MESSAGES[key];
  const names: string[] = [];
  const source = template
    .split(PLACEHOLDER)
    .map((part, index) => {
      // `split` with a capture group alternates text and placeholder names.
      if (index % 2 === 0) return escapeRegex(part);
      names.push(part);
      return '(.+?)';
    })
    .join('');
  return { key, names, pattern: new RegExp(`^${source}$`) };
});

/**
 * Key and params of a pt-BR validation message built by `validationMessage`, or `null` for any
 * other text (a Zod default message, a server message). Numeric params come back as numbers.
 */
export function matchValidationMessage(
  message: string,
): { key: ValidationKey; params: Record<string, string | number> } | null {
  for (const { key, names, pattern } of MATCHERS) {
    const match = pattern.exec(message);
    if (!match) continue;
    const params: Record<string, string | number> = {};
    names.forEach((name, index) => {
      const value = match[index + 1] ?? '';
      params[name] = /^\d+$/.test(value) ? Number(value) : value;
    });
    return { key, params };
  }
  return null;
}
