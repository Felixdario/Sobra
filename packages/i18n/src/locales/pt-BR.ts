import type { CatalogTree } from '../types';
import { ptBRMobile } from './mobile/pt-BR';
import { ptBRWeb } from './web/pt-BR';

/**
 * Source catalog. Every other locale must have exactly these keys (checked by the `Catalog` type
 * and by a test). Conventions are in the package README: `domain.area.item`, camelCase segments,
 * `{name}` placeholders, plurals as `{ zero?, one, many?, other }` objects with `{count}`.
 */
export const ptBRBase = {
  common: {
    actions: {
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      create: 'Criar',
      add: 'Adicionar',
      close: 'Fechar',
      back: 'Voltar',
      confirm: 'Confirmar',
      continue: 'Continuar',
      retry: 'Tentar de novo',
      undo: 'Desfazer',
      search: 'Buscar',
      clearFilters: 'Limpar filtros',
      signIn: 'Entrar',
      signUp: 'Criar conta',
      signOut: 'Sair',
    },
    states: {
      loading: 'Carregando…',
      saving: 'Salvando…',
      saved: 'Salvo',
      empty: 'Nada por aqui ainda.',
      emptyFiltered: 'Nada encontrado com esses filtros.',
      offline: 'Sem conexão',
      offlineHint: 'Sem conexão — os dados aparecem quando a conexão voltar.',
      error: 'Algo deu errado.',
      failedOffline: '{what}: sem conexão com o servidor.',
    },
    labels: {
      optional: 'opcional',
      none: '—',
    },
  },

  nav: {
    dashboard: 'Painel',
    summary: 'Resumo',
    transactions: 'Transações',
    accounts: 'Contas',
    categories: 'Categorias',
    budgets: 'Orçamentos',
    import: 'Importar CSV',
    settings: 'Ajustes',
  },

  accountTypes: {
    checking: 'Conta corrente',
    savings: 'Poupança',
    credit_card: 'Cartão de crédito',
    cash: 'Dinheiro',
  },

  transactionTypes: {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência',
  },

  categoryKinds: {
    income: 'Receita',
    expense: 'Despesa',
  },

  categories: {
    uncategorized: 'Sem categoria',
    /** Names of the default categories while the user has not renamed them (`systemKey`). */
    default: {
      salary: 'Salário',
      freelance: 'Freelance',
      investments: 'Rendimentos',
      housing: 'Moradia',
      groceries: 'Mercado',
      transport: 'Transporte',
      restaurants: 'Restaurantes',
      leisure: 'Lazer',
      health: 'Saúde',
      education: 'Educação',
      subscriptions: 'Assinaturas',
      shopping: 'Compras',
      other: 'Outros',
    },
  },

  accounts: {
    /** Name of the account created at sign-up (stored in the sign-up language). */
    defaultName: 'Carteira',
  },

  counts: {
    transactions: {
      zero: 'Nenhuma transação',
      one: '{count} transação',
      other: '{count} transações',
    },
    accounts: { zero: 'Nenhuma conta', one: '{count} conta', other: '{count} contas' },
    categories: {
      zero: 'Nenhuma categoria',
      one: '{count} categoria',
      other: '{count} categorias',
    },
  },

  preferences: {
    title: 'Preferências',
    language: 'Idioma',
    currency: 'Moeda',
    currencyHint:
      'É a moeda em que você registra seus valores. Trocar muda só a exibição: o Sobra não converte câmbio.',
    locales: {
      'pt-BR': 'Português (Brasil)',
      'en-US': 'English (US)',
    },
    currencies: {
      BRL: 'Real brasileiro (R$)',
      USD: 'Dólar americano (US$)',
      EUR: 'Euro (€)',
    },
  },

  /** By `ApiError.code`: the client's own codes and the API's `API_ERROR_CODES`. */
  errors: {
    NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.',
    TIMEOUT: 'O servidor demorou demais para responder. Tente de novo.',
    ABORTED: 'A requisição foi cancelada.',
    INVALID_RESPONSE: 'O servidor respondeu num formato inesperado. Tente de novo mais tarde.',
    HTTP_ERROR: 'Erro inesperado do servidor. Tente de novo mais tarde.',
    SESSION_EXPIRED: 'Sua sessão expirou. Entre de novo para continuar.',
    VALIDATION_ERROR: 'Alguns dados estão inválidos. Confira os campos e tente de novo.',
    BAD_REQUEST: 'Requisição inválida.',
    UNAUTHORIZED: 'Você precisa entrar para continuar.',
    FORBIDDEN: 'Você não tem permissão para fazer isso.',
    NOT_FOUND: 'Não encontrado.',
    CONFLICT: 'Conflito com o estado atual. Atualize e tente de novo.',
    PAYLOAD_TOO_LARGE: 'O conteúdo enviado é grande demais.',
    RATE_LIMITED: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    INTERNAL_ERROR: 'Erro no servidor. Tente de novo mais tarde.',
    unknown: 'Erro inesperado.',
  },

  /**
   * Form and API validation messages by `VALIDATION_MESSAGES` key of @sobra/shared (texts equal to
   * the registry, checked by a test), plus `generic` for Zod's own issues. Use `translateIssue`.
   */
  validation: {
    generic: {
      required: 'Campo obrigatório',
      invalid: 'Valor inválido',
      tooSmall: 'O valor deve ser no mínimo {min}',
      tooLarge: 'O valor deve ser no máximo {max}',
    },
    common: {
      idInvalid: 'Identificador inválido',
      updateEmpty: 'Informe ao menos um campo para atualizar',
      colorInvalid: 'Cor inválida: use o formato #RRGGBB',
      iconInvalid: 'Ícone inválido',
      monthInvalid: 'Mês inválido: use o formato AAAA-MM',
      dateInvalid: 'Data inválida: use o formato AAAA-MM-DD com uma data existente',
      dateTimeInvalid: 'Data e hora inválidas',
    },
    amount: {
      notInteger: 'O valor deve ser um número inteiro de centavos',
      notPositive: 'O valor deve ser maior que zero',
    },
    name: {
      required: 'Informe o nome',
      tooLong: 'O nome deve ter no máximo {max} caracteres',
    },
    pagination: {
      pageInvalid: 'Página inválida',
      pageTooSmall: 'A página deve ser no mínimo 1',
      pageSizeInvalid: 'Tamanho de página inválido',
      pageSizeTooSmall: 'O tamanho da página deve ser no mínimo 1',
      pageSizeTooLarge: 'O tamanho da página deve ser no máximo {max}',
    },
    sort: {
      directionInvalid: 'Direção de ordenação inválida: use asc ou desc',
      fieldInvalid: 'Campo de ordenação inválido',
    },
    auth: {
      emailRequired: 'Informe o e-mail',
      emailInvalid: 'E-mail inválido',
      passwordRequired: 'Informe a senha',
      passwordTooShort: 'A senha deve ter no mínimo {min} caracteres',
      passwordTooLong: 'A senha deve ter no máximo {max} caracteres',
      refreshTokenMissing: 'Token de renovação ausente',
    },
    preferences: {
      localeInvalid: 'Idioma inválido: use pt-BR ou en-US',
      localeTagInvalid: 'Idioma inválido',
      currencyInvalid: 'Moeda inválida: use BRL, USD ou EUR',
    },
    account: {
      typeInvalid: 'Tipo de conta inválido',
      archivedInvalid: 'O campo arquivada deve ser verdadeiro ou falso',
    },
    category: {
      kindInvalid: 'Tipo de categoria inválido: use receita (income) ou despesa (expense)',
      required: 'Informe uma categoria válida',
    },
    transaction: {
      typeInvalid: 'Tipo de transação inválido',
      typeInvalidHint: 'Tipo de transação inválido: use income, expense ou transfer',
      descriptionRequired: 'Informe a descrição',
      descriptionTooLong: 'A descrição deve ter no máximo {max} caracteres',
      notesInvalid: 'As observações devem ser um texto',
      notesTooLong: 'As observações devem ter no máximo {max} caracteres',
      toAccountRequired: 'Informe uma conta de destino válida',
      sameAccount: 'A conta de destino deve ser diferente da conta de origem',
    },
    recurring: {
      ruleRequired: 'Informe a regra de recorrência',
      frequencyInvalid: 'Frequência inválida: use weekly, monthly ou yearly',
      intervalNotInteger: 'O intervalo deve ser um número inteiro',
      intervalTooSmall: 'O intervalo deve ser no mínimo 1',
      intervalTooLarge: 'O intervalo deve ser no máximo {max}',
      dayOfMonthNotInteger: 'O dia do mês deve ser um número inteiro',
      dayOfMonthOutOfRange: 'O dia do mês deve estar entre 1 e 31',
      endBeforeStart: 'A data final deve ser igual ou posterior à data inicial',
      dayOfMonthWeekly: 'O dia do mês não se aplica à recorrência semanal',
      activeInvalid: 'O campo ativa deve ser verdadeiro ou falso',
    },
    csv: {
      columnMissing: 'Coluna {column} ausente',
      columnTooLong: 'Coluna {column} longa demais',
      noRows: 'O arquivo não tem linhas para importar',
      tooManyRows: 'O arquivo deve ter no máximo {max} linhas',
      contentMissing: 'Envie o conteúdo do arquivo CSV',
      empty: 'O arquivo está vazio',
      tooLarge: 'O arquivo é grande demais',
      typeInvalid: 'Tipo inválido: use income ou expense',
      requestInvalid: 'Envie o conteúdo do arquivo CSV ou as linhas já separadas',
      fileNameInvalid: 'Nome de arquivo inválido',
      forceInvalid: 'O campo force deve ser verdadeiro ou falso',
    },
    summary: {
      granularityInvalid: 'Granularidade inválida',
      rangeInvalid: 'O mês inicial deve ser igual ou anterior ao mês final',
    },
  },
} as const satisfies CatalogTree;

/** Shared keys plus each app's own block (`web.*`, `mobile.*`), kept in separate files. */
export const ptBR = {
  ...ptBRBase,
  web: ptBRWeb,
  mobile: ptBRMobile,
} as const satisfies CatalogTree;
