import type { Catalog } from '../catalog';
import type { Widen } from '../types';
import { enUSMobile } from './mobile/en-US';
import type { ptBRBase } from './pt-BR';
import { enUSWeb } from './web/en-US';

/** English (US). Typed as `Catalog`: a missing or extra key anywhere is a compile error. */
const enUSBase: Widen<typeof ptBRBase> = {
  common: {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      add: 'Add',
      close: 'Close',
      back: 'Back',
      confirm: 'Confirm',
      continue: 'Continue',
      retry: 'Try again',
      undo: 'Undo',
      search: 'Search',
      clearFilters: 'Clear filters',
      signIn: 'Sign in',
      signUp: 'Create account',
      signOut: 'Sign out',
    },
    states: {
      loading: 'Loading…',
      saving: 'Saving…',
      saved: 'Saved',
      empty: 'Nothing here yet.',
      emptyFiltered: 'Nothing matches these filters.',
      offline: 'Offline',
      offlineHint: 'Offline — your data shows up when the connection is back.',
      error: 'Something went wrong.',
      failedOffline: '{what}: no connection to the server.',
    },
    labels: {
      optional: 'optional',
      none: '—',
    },
  },

  nav: {
    dashboard: 'Dashboard',
    summary: 'Summary',
    transactions: 'Transactions',
    accounts: 'Accounts',
    categories: 'Categories',
    budgets: 'Budgets',
    import: 'Import CSV',
    settings: 'Settings',
  },

  accountTypes: {
    checking: 'Checking account',
    savings: 'Savings',
    credit_card: 'Credit card',
    cash: 'Cash',
  },

  transactionTypes: {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
  },

  categoryKinds: {
    income: 'Income',
    expense: 'Expense',
  },

  categories: {
    uncategorized: 'Uncategorized',
    default: {
      salary: 'Salary',
      freelance: 'Freelance',
      investments: 'Investment income',
      housing: 'Housing',
      groceries: 'Groceries',
      transport: 'Transportation',
      restaurants: 'Restaurants',
      leisure: 'Entertainment',
      health: 'Health',
      education: 'Education',
      subscriptions: 'Subscriptions',
      shopping: 'Shopping',
      other: 'Other',
    },
  },

  accounts: {
    defaultName: 'Wallet',
  },

  counts: {
    transactions: {
      zero: 'No transactions',
      one: '{count} transaction',
      other: '{count} transactions',
    },
    accounts: { zero: 'No accounts', one: '{count} account', other: '{count} accounts' },
    categories: { zero: 'No categories', one: '{count} category', other: '{count} categories' },
  },

  preferences: {
    title: 'Preferences',
    language: 'Language',
    currency: 'Currency',
    currencyHint:
      'The currency you record your amounts in. Changing it only changes how they are shown: Sobra does not convert exchange rates.',
    locales: {
      'pt-BR': 'Português (Brasil)',
      'en-US': 'English (US)',
    },
    currencies: {
      BRL: 'Brazilian real (R$)',
      USD: 'US dollar ($)',
      EUR: 'Euro (€)',
    },
  },

  errors: {
    NETWORK_ERROR: "Couldn't reach the server. Check your connection and try again.",
    TIMEOUT: 'The server took too long to respond. Try again.',
    ABORTED: 'The request was canceled.',
    INVALID_RESPONSE: 'The server sent an unexpected response. Try again later.',
    HTTP_ERROR: 'Unexpected server error. Try again later.',
    SESSION_EXPIRED: 'Your session expired. Sign in again to continue.',
    VALIDATION_ERROR: 'Some fields are invalid. Check them and try again.',
    BAD_REQUEST: 'Invalid request.',
    UNAUTHORIZED: 'You need to sign in to continue.',
    FORBIDDEN: "You don't have permission to do that.",
    NOT_FOUND: 'Not found.',
    CONFLICT: 'This conflicts with the current state. Refresh and try again.',
    PAYLOAD_TOO_LARGE: 'What you sent is too large.',
    RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
    INTERNAL_ERROR: 'Server error. Try again later.',
    unknown: 'Unexpected error.',
  },

  validation: {
    generic: {
      required: 'Required field',
      invalid: 'Invalid value',
      tooSmall: 'The value must be at least {min}',
      tooLarge: 'The value must be at most {max}',
    },
    common: {
      idInvalid: 'Invalid identifier',
      updateEmpty: 'Provide at least one field to update',
      colorInvalid: 'Invalid color: use the #RRGGBB format',
      iconInvalid: 'Invalid icon',
      monthInvalid: 'Invalid month: use the YYYY-MM format',
      dateInvalid: 'Invalid date: use the YYYY-MM-DD format with a real date',
      dateTimeInvalid: 'Invalid date and time',
    },
    amount: {
      notInteger: 'The amount must be a whole number of cents',
      notPositive: 'The amount must be greater than zero',
    },
    name: {
      required: 'Enter a name',
      tooLong: 'The name must be at most {max} characters',
    },
    pagination: {
      pageInvalid: 'Invalid page',
      pageTooSmall: 'The page must be at least 1',
      pageSizeInvalid: 'Invalid page size',
      pageSizeTooSmall: 'The page size must be at least 1',
      pageSizeTooLarge: 'The page size must be at most {max}',
    },
    sort: {
      directionInvalid: 'Invalid sort direction: use asc or desc',
      fieldInvalid: 'Invalid sort field',
    },
    auth: {
      emailRequired: 'Enter your email',
      emailInvalid: 'Invalid email',
      passwordRequired: 'Enter your password',
      passwordTooShort: 'The password must be at least {min} characters',
      passwordTooLong: 'The password must be at most {max} characters',
      refreshTokenMissing: 'Missing refresh token',
    },
    preferences: {
      localeInvalid: 'Invalid language: use pt-BR or en-US',
      localeTagInvalid: 'Invalid language',
      currencyInvalid: 'Invalid currency: use BRL, USD or EUR',
    },
    account: {
      typeInvalid: 'Invalid account type',
      archivedInvalid: 'Archived must be true or false',
    },
    category: {
      kindInvalid: 'Invalid category type: use income or expense',
      required: 'Choose a valid category',
    },
    transaction: {
      typeInvalid: 'Invalid transaction type',
      typeInvalidHint: 'Invalid transaction type: use income, expense or transfer',
      descriptionRequired: 'Enter a description',
      descriptionTooLong: 'The description must be at most {max} characters',
      notesInvalid: 'Notes must be text',
      notesTooLong: 'Notes must be at most {max} characters',
      toAccountRequired: 'Choose a valid destination account',
      sameAccount: 'The destination account must differ from the source account',
    },
    recurring: {
      ruleRequired: 'Enter the recurrence rule',
      frequencyInvalid: 'Invalid frequency: use weekly, monthly or yearly',
      intervalNotInteger: 'The interval must be a whole number',
      intervalTooSmall: 'The interval must be at least 1',
      intervalTooLarge: 'The interval must be at most {max}',
      dayOfMonthNotInteger: 'The day of the month must be a whole number',
      dayOfMonthOutOfRange: 'The day of the month must be between 1 and 31',
      endBeforeStart: 'The end date must be on or after the start date',
      dayOfMonthWeekly: "The day of the month doesn't apply to weekly recurrences",
      activeInvalid: 'Active must be true or false',
    },
    csv: {
      columnMissing: 'Column {column} is missing',
      columnTooLong: 'Column {column} is too long',
      noRows: 'The file has no rows to import',
      tooManyRows: 'The file must have at most {max} rows',
      contentMissing: 'Send the CSV file content',
      empty: 'The file is empty',
      tooLarge: 'The file is too large',
      typeInvalid: 'Invalid type: use income or expense',
      requestInvalid: 'Send the CSV file content or the rows already split into columns',
      fileNameInvalid: 'Invalid file name',
      forceInvalid: 'Force must be true or false',
    },
    summary: {
      granularityInvalid: 'Invalid granularity',
      rangeInvalid: 'The start month must be on or before the end month',
    },
  },
};

export const enUS: Catalog = { ...enUSBase, web: enUSWeb, mobile: enUSMobile };
