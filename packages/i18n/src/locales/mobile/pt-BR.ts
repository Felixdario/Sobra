import type { CatalogTree } from '../../types';

/** Keys used only by the mobile app: `mobile.<screen>.<item>`. */
export const ptBRMobile = {
  tabs: {
    launch: 'Lançar',
  },

  auth: {
    tagline: 'Lance no celular, saiba quanto sobra.',
    fields: {
      name: 'Nome',
      email: 'E-mail',
      password: 'Senha',
      passwordPlaceholder: 'Mínimo de {min} caracteres',
    },
    signIn: {
      demo: 'Usar conta de demonstração',
      noAccount: 'Ainda não tem conta?',
      /** 401 on the sign-in screen. */
      invalidCredentials: 'E-mail ou senha incorretos.',
    },
    signUp: {
      subtitle: 'Leva meio minuto. Categorias e uma carteira já vêm prontas.',
      hasAccount: 'Já tem conta?',
      /** 409 on the sign-up screen. */
      emailTaken: 'Este e-mail já está cadastrado.',
    },
  },

  states: {
    offlineSince: 'Sem conexão — mostrando os dados de {time}',
    /** Prefix before a load error when the device is offline. */
    offlinePrefix: 'Sem conexão. {message}',
  },

  month: {
    closed: 'mês fechado',
    partial: 'parcial · dia {day} de {total}',
    future: 'mês futuro',
    previous: 'Mês anterior: {month}',
    next: 'Próximo mês: {month}',
  },

  summary: {
    loading: 'Carregando o resumo',
    loadError: 'Não deu para carregar o resumo de {month}.',
    empty: 'Nenhum lançamento em {month}. Lance o primeiro gasto.',
    whereItWent: 'Para onde foi',
    spendingError: 'Não deu para carregar os gastos por categoria.',
    budgets: 'Orçamentos',
    budgetsEmpty: 'Sem orçamentos em {month}. Defina orçamentos no painel web.',
    budgetsError: 'Não deu para carregar os orçamentos.',
    headline: {
      spentSoFar: 'Gasto até agora',
      leftSoFar: 'Sobra até agora',
      left: 'Sobrou',
      short: 'Faltaram',
      soFar: 'Até agora: {received} recebidos, {spent} gastos · {progress}',
      shortDetail: '{spent} gastos para {received} recebidos',
      leftDetail: 'de {received} recebidos',
      leftDetailRate: 'de {received} recebidos · taxa de poupança {rate}',
      same: 'Igual a {month}',
      more: '{amount} a mais que em {month}',
      less: '{amount} a menos que em {month}',
    },
    kpis: {
      income: 'Receitas',
      expense: 'Despesas',
      balance: 'Saldo em contas',
    },
    ruler: {
      received: 'Recebido {amount}',
      left: 'Sobra {amount}',
      beyond: 'Além do recebido {amount}',
      short: 'Faltaram {amount}',
      others: 'Outras',
      segment: '{name} {amount}.',
      a11y: 'Régua do mês. {description}',
    },
    budget: {
      figures: '{actual} de {budgeted}',
      over: '{amount} acima',
      near: 'Perto do limite · restam {amount}',
      ok: 'Restam {amount}',
      a11yOver: '{name}: {actual} de {budgeted}. {amount} acima do orçamento.',
      a11yNear: '{name}: {actual} de {budgeted}. Perto do limite, restam {amount}.',
      a11yOk: '{name}: {actual} de {budgeted}. Restam {amount}.',
    },
  },

  launch: {
    title: {
      expense: 'Lançar gasto',
      income: 'Lançar receita',
      edit: 'Editar transação',
      editTransfer: 'Editar transferência',
    },
    typeLabel: 'Tipo do lançamento',
    amountA11y: 'Valor: {amount}',
    maxAmount: 'Valor máximo: {amount}.',
    account: 'Conta',
    accountA11y: 'Conta: {name}. Trocar conta',
    noAccount: 'nenhuma',
    date: 'Data',
    dateA11y: 'Data: {date}. Trocar data',
    description: 'Descrição',
    descriptionA11y: 'Descrição (opcional)',
    descriptionDefault: 'Padrão: {name}',
    descriptionDefaultEmpty: 'Padrão: nome da categoria',
    notes: 'Observações',
    notesA11y: 'Observações (opcional)',
    category: 'Categoria',
    categoryFallback: 'categoria',
    categoriesLoading: 'Carregando categorias',
    categoriesError: 'Não deu para carregar as categorias.',
    transferNote:
      'Transferência entre contas: não tem categoria e não entra em receitas nem despesas.',
    save: {
      expense: 'Salvar despesa',
      income: 'Salvar receita',
      edit: 'Salvar alterações',
    },
    missing: {
      account: 'Crie uma conta no painel web para lançar.',
      amount: 'Digite o valor.',
      category: 'Escolha a categoria.',
    },
    keypad: {
      doubleZero: 'Dois zeros',
      backspace: 'Apagar último dígito',
      backspaceHint: 'Toque e segure para zerar',
    },
    toast: {
      expenseSaved: 'Gasto de {amount} em {category} lançado.',
      incomeSaved: 'Receita de {amount} em {category} lançada.',
      saveFailed: 'Não deu para salvar {amount} em {category}. {error}',
      updated: 'Transação atualizada.',
      updateFailed: 'Não deu para salvar a alteração. {error}',
    },
  },

  transactions: {
    searchPlaceholder: 'Buscar na descrição',
    searchA11y: 'Buscar transações',
    filters: 'Filtros',
    filtersActive: {
      one: 'Filtros, {count} ativo',
      other: 'Filtros, {count} ativos',
    },
    removeFilter: 'Remover filtro {label}',
    clear: 'Limpar',
    loading: 'Carregando transações',
    loadError: 'Não deu para carregar as transações.',
    empty: 'Nenhum lançamento ainda. Lance o primeiro gasto.',
    dayA11y: '{day}, saldo do dia {amount}',
    transferMeta: 'Transferência · {description}',
    rowA11y: '{description}, {category}, {account}, {amount}',
    transferA11y: '{description}, transferência de {from} para {to}, {amount}',
    filter: {
      month: 'Mês',
      account: 'Conta',
      category: 'Categoria',
      allMonths: 'Todos',
      all: 'Todas',
      done: 'Ver transações',
    },
    row: {
      delete: 'Apagar',
      more: 'Mais ações',
      hint: 'Tem ações: editar e apagar.',
      savingHint: 'Ainda salvando.',
      menu: 'Ações da transação',
    },
    toast: {
      deleted: '“{description}” apagada.',
      deleteFailed: 'Não deu para apagar “{description}”. {error}',
      restored: '“{description}” de volta.',
      undoFailed: 'Não deu para desfazer. {error}',
    },
  },

  settings: {
    theme: 'Tema',
    themes: {
      system: 'Sistema',
      light: 'Claro',
      dark: 'Escuro',
    },
    languageAndCurrency: 'Idioma e moeda',
    preferencesFailed: 'Não deu para salvar a preferência. {error}',
  },

  toast: {
    actionAvailable: '{message} {action} disponível.',
  },

  a11y: {
    close: 'Fechar',
    /** Amounts read out by screen readers: "menos 412 reais e 37 centavos". */
    money: {
      negative: 'menos {amount}',
      join: '{whole} e {cents}',
      cents: { zero: '{count} centavos', one: '{count} centavo', other: '{count} centavos' },
      units: {
        BRL: { zero: '{count} reais', one: '{count} real', other: '{count} reais' },
        USD: { zero: '{count} dólares', one: '{count} dólar', other: '{count} dólares' },
        EUR: { zero: '{count} euros', one: '{count} euro', other: '{count} euros' },
      },
    },
  },

  dev: {
    data: 'Desenvolvimento · dados',
    scenario: 'Cenário',
    scenarios: {
      demo: 'Demo',
      worst: 'Pior caso',
      empty: 'Vazio',
      one: 'Uma',
      error: 'Erro 500',
      offline: 'Sem rede',
    },
    fontScale: 'Tamanho do texto (simulado na web)',
    fontScaleLabel: 'Tamanho',
  },
} as const satisfies CatalogTree;
