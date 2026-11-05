import type { Widen } from '../../types';
import type { ptBRMobile } from './pt-BR';

export const enUSMobile: Widen<typeof ptBRMobile> = {
  tabs: {
    launch: 'Add',
  },

  auth: {
    tagline: 'Log it on your phone, know what’s left.',
    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      passwordPlaceholder: 'At least {min} characters',
    },
    signIn: {
      demo: 'Use the demo account',
      noAccount: 'Don’t have an account?',
      invalidCredentials: 'Incorrect email or password.',
    },
    signUp: {
      subtitle: 'Takes half a minute. Categories and a wallet come ready.',
      hasAccount: 'Already have an account?',
      emailTaken: 'This email is already registered.',
    },
  },

  states: {
    offlineSince: 'Offline — showing data from {time}',
    offlinePrefix: 'Offline. {message}',
  },

  month: {
    closed: 'closed month',
    partial: 'partial · day {day} of {total}',
    future: 'future month',
    previous: 'Previous month: {month}',
    next: 'Next month: {month}',
  },

  summary: {
    loading: 'Loading the summary',
    loadError: 'Couldn’t load the summary for {month}.',
    empty: 'Nothing logged in {month}. Add your first expense.',
    whereItWent: 'Where it went',
    spendingError: 'Couldn’t load spending by category.',
    budgets: 'Budgets',
    budgetsEmpty: 'No budgets in {month}. Set budgets on the web dashboard.',
    budgetsError: 'Couldn’t load the budgets.',
    headline: {
      spentSoFar: 'Spent so far',
      leftSoFar: 'Left so far',
      left: 'Left over',
      short: 'Short by',
      soFar: 'So far: {received} received, {spent} spent · {progress}',
      shortDetail: '{spent} spent against {received} received',
      leftDetail: 'of {received} received',
      leftDetailRate: 'of {received} received · savings rate {rate}',
      same: 'Same as {month}',
      more: '{amount} more than in {month}',
      less: '{amount} less than in {month}',
    },
    kpis: {
      income: 'Income',
      expense: 'Expenses',
      balance: 'Account balance',
    },
    ruler: {
      received: 'Received {amount}',
      left: 'Left {amount}',
      beyond: 'Beyond income {amount}',
      short: 'Short by {amount}',
      others: 'Others',
      segment: '{name} {amount}.',
      a11y: 'Month ruler. {description}',
    },
    budget: {
      figures: '{actual} of {budgeted}',
      over: '{amount} over',
      near: 'Near the limit · {amount} left',
      ok: '{amount} left',
      a11yOver: '{name}: {actual} of {budgeted}. {amount} over budget.',
      a11yNear: '{name}: {actual} of {budgeted}. Near the limit, {amount} left.',
      a11yOk: '{name}: {actual} of {budgeted}. {amount} left.',
    },
  },

  launch: {
    title: {
      expense: 'Add expense',
      income: 'Add income',
      edit: 'Edit transaction',
      editTransfer: 'Edit transfer',
    },
    typeLabel: 'Entry type',
    amountA11y: 'Amount: {amount}',
    maxAmount: 'Maximum amount: {amount}.',
    account: 'Account',
    accountA11y: 'Account: {name}. Change account',
    noAccount: 'none',
    date: 'Date',
    dateA11y: 'Date: {date}. Change date',
    description: 'Description',
    descriptionA11y: 'Description (optional)',
    descriptionDefault: 'Default: {name}',
    descriptionDefaultEmpty: 'Default: category name',
    notes: 'Notes',
    notesA11y: 'Notes (optional)',
    category: 'Category',
    categoryFallback: 'category',
    categoriesLoading: 'Loading categories',
    categoriesError: 'Couldn’t load the categories.',
    transferNote:
      'Transfer between accounts: it has no category and counts as neither income nor expense.',
    save: {
      expense: 'Save expense',
      income: 'Save income',
      edit: 'Save changes',
    },
    missing: {
      account: 'Create an account on the web dashboard to add entries.',
      amount: 'Enter the amount.',
      category: 'Pick a category.',
    },
    keypad: {
      doubleZero: 'Double zero',
      backspace: 'Delete last digit',
      backspaceHint: 'Touch and hold to clear',
    },
    toast: {
      expenseSaved: 'Expense of {amount} in {category} added.',
      incomeSaved: 'Income of {amount} in {category} added.',
      saveFailed: 'Couldn’t save {amount} in {category}. {error}',
      updated: 'Transaction updated.',
      updateFailed: 'Couldn’t save the change. {error}',
    },
  },

  transactions: {
    searchPlaceholder: 'Search descriptions',
    searchA11y: 'Search transactions',
    filters: 'Filters',
    filtersActive: {
      one: 'Filters, {count} active',
      other: 'Filters, {count} active',
    },
    removeFilter: 'Remove filter {label}',
    clear: 'Clear',
    loading: 'Loading transactions',
    loadError: 'Couldn’t load the transactions.',
    empty: 'Nothing logged yet. Add your first expense.',
    dayA11y: '{day}, day total {amount}',
    transferMeta: 'Transfer · {description}',
    rowA11y: '{description}, {category}, {account}, {amount}',
    transferA11y: '{description}, transfer from {from} to {to}, {amount}',
    filter: {
      month: 'Month',
      account: 'Account',
      category: 'Category',
      allMonths: 'All',
      all: 'All',
      done: 'Show transactions',
    },
    row: {
      delete: 'Delete',
      more: 'More actions',
      hint: 'Has actions: edit and delete.',
      savingHint: 'Still saving.',
      menu: 'Transaction actions',
    },
    toast: {
      deleted: '“{description}” deleted.',
      deleteFailed: 'Couldn’t delete “{description}”. {error}',
      restored: '“{description}” is back.',
      undoFailed: 'Couldn’t undo. {error}',
    },
  },

  settings: {
    theme: 'Theme',
    themes: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    languageAndCurrency: 'Language and currency',
    preferencesFailed: 'Couldn’t save the preference. {error}',
  },

  toast: {
    actionAvailable: '{message} {action} available.',
  },

  a11y: {
    close: 'Close',
    money: {
      negative: 'minus {amount}',
      join: '{whole} and {cents}',
      cents: { zero: '{count} cents', one: '{count} cent', other: '{count} cents' },
      units: {
        BRL: { zero: '{count} reais', one: '{count} real', other: '{count} reais' },
        USD: { zero: '{count} dollars', one: '{count} dollar', other: '{count} dollars' },
        EUR: { zero: '{count} euros', one: '{count} euro', other: '{count} euros' },
      },
    },
  },

  dev: {
    data: 'Development · data',
    scenario: 'Scenario',
    scenarios: {
      demo: 'Demo',
      worst: 'Worst case',
      empty: 'Empty',
      one: 'One',
      error: 'Error 500',
      offline: 'Offline',
    },
    fontScale: 'Text size (simulated on web)',
    fontScaleLabel: 'Size',
  },
};
