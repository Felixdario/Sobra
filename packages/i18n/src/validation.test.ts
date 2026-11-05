import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  accountCreateSchema,
  accountUpdateSchema,
  budgetCopySchema,
  budgetUpsertSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  csvImportCommitRequestSchema,
  csvImportPreviewRequestSchema,
  loginSchema,
  recurringCreateSchema,
  recurringUpdateSchema,
  registerSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
  userPreferencesUpdateSchema,
  VALIDATION_KEYS,
  VALIDATION_MESSAGES,
  validationMessage,
} from '@sobra/shared';
import type { MessageKey } from './catalog';
import {
  createTranslator,
  resolveIssue,
  translateFieldError,
  translateIssue,
  type Translator,
} from './translator';

const pt = createTranslator('pt-BR');
const en = createTranslator('en-US');

const ID_A = '0198f1c2-0000-7000-8000-0000000000a1';
const ID_B = '0198f1c2-0000-7000-8000-0000000000a2';

/** Messages of every issue a schema raises for `input`, translated. */
function messages(t: Translator, schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => translateIssue(t, issue));
}

describe('registro de mensagens × catálogo', () => {
  it('todo VALIDATION_KEY tem chave no catálogo (checado pelo compilador também)', () => {
    for (const key of VALIDATION_KEYS) {
      const catalogKey: MessageKey = `validation.${key}`;
      expect(pt.has(catalogKey) && en.has(catalogKey)).toBe(true);
    }
  });

  it('o texto pt-BR do catálogo é exatamente o do registro (a API continua igual)', () => {
    for (const key of VALIDATION_KEYS) {
      const params = { max: 80, min: 8, column: 'Valor' };
      const text = (validationMessage as (k: string, p: object) => string)(key, params);
      expect(translateIssue(pt, { message: text })).toBe(text);
      expect(VALIDATION_MESSAGES[key]).not.toBe('');
    }
  });

  it('en-US nunca devolve o texto pt-BR do registro', () => {
    for (const key of VALIDATION_KEYS) {
      const text = (validationMessage as (k: string, p: object) => string)(key, {
        max: 80,
        min: 8,
        column: 'Valor',
      });
      expect([key, translateIssue(en, { message: text })]).not.toEqual([key, text]);
    }
  });
});

describe('schemas principais nos dois idiomas', () => {
  it('cadastro e login', () => {
    const bad = { name: ' ', email: 'nope', password: 'curta' };
    expect(messages(pt, registerSchema, bad)).toEqual([
      'Informe o nome',
      'E-mail inválido',
      'A senha deve ter no mínimo 8 caracteres',
    ]);
    expect(messages(en, registerSchema, bad)).toEqual([
      'Enter a name',
      'Invalid email',
      'The password must be at least 8 characters',
    ]);
    expect(messages(en, registerSchema, { ...bad, name: 'x'.repeat(81) })[0]).toBe(
      'The name must be at most 80 characters',
    );
    expect(
      messages(en, registerSchema, { name: 'Ana', email: 'a@b.co', password: 'x'.repeat(129) }),
    ).toEqual(['The password must be at most 128 characters']);
    expect(messages(en, loginSchema, {})).toEqual(['Enter your email', 'Enter your password']);
  });

  it('transação: valor zero, negativo e fracionado; mesma conta; data e descrição', () => {
    const base = {
      type: 'expense',
      accountId: ID_A,
      categoryId: ID_B,
      amount: 100,
      description: 'Mercado',
      date: '2026-11-04',
    };
    expect(messages(en, transactionCreateSchema, { ...base, amount: 0 })).toEqual([
      'The amount must be greater than zero',
    ]);
    expect(messages(en, transactionCreateSchema, { ...base, amount: -5 })).toEqual([
      'The amount must be greater than zero',
    ]);
    expect(messages(en, transactionCreateSchema, { ...base, amount: 1.5 })).toEqual([
      'The amount must be a whole number of cents',
    ]);
    expect(messages(pt, transactionCreateSchema, { ...base, amount: 0 })).toEqual([
      'O valor deve ser maior que zero',
    ]);
    expect(
      messages(en, transactionCreateSchema, {
        type: 'transfer',
        accountId: ID_A,
        toAccountId: ID_A,
        amount: 100,
        description: 'Poupança',
        date: '2026-11-04',
      }),
    ).toEqual(['The destination account must differ from the source account']);
    expect(
      messages(en, transactionCreateSchema, { ...base, date: '2026-02-30', description: '' }),
    ).toEqual(['Enter a description', 'Invalid date: use the YYYY-MM-DD format with a real date']);
  });

  it('conta, categoria e orçamento', () => {
    expect(
      messages(en, accountCreateSchema, { name: 'Banco', type: 'loan', color: 'blue', icon: 'x' }),
    ).toEqual(['Invalid account type', 'Invalid color: use the #RRGGBB format', 'Invalid icon']);
    expect(messages(en, accountUpdateSchema, {})).toEqual(['Provide at least one field to update']);
    expect(
      messages(en, categoryCreateSchema, {
        name: 'Pets',
        kind: 'other',
        color: '#112233',
        icon: 'paw',
      }),
    ).toEqual(['Invalid category type: use income or expense']);
    expect(
      messages(en, budgetUpsertSchema, { categoryId: 'x', month: '2026-13', amount: 0 }),
    ).toEqual([
      'Choose a valid category',
      'Invalid month: use the YYYY-MM format',
      'The amount must be greater than zero',
    ]);
    expect(
      messages(pt, budgetUpsertSchema, { categoryId: ID_A, month: '2026-13', amount: 1 }),
    ).toEqual(['Mês inválido: use o formato AAAA-MM']);
  });
});

describe('cobertura: nenhum issue de formulário cai no fallback', () => {
  const long = 'x'.repeat(3000);
  const forms: [string, z.ZodType, unknown[]][] = [
    [
      'register',
      registerSchema,
      [
        {},
        { name: 1, email: 1, password: 1 },
        { name: '', email: '', password: '' },
        { name: long, email: 'a@', password: long },
      ],
    ],
    ['login', loginSchema, [{}, { email: 1, password: 1 }, { email: '', password: '' }]],
    [
      'preferences',
      userPreferencesUpdateSchema,
      [{}, { locale: 'xx', currency: 'GBP' }, { locale: 1, currency: 1 }],
    ],
    [
      'accountCreate',
      accountCreateSchema,
      [
        {},
        { name: 1, type: 1, initialBalance: 'x', color: 1, icon: 1 },
        { name: long, type: 'x', initialBalance: 1.5, color: '#12', icon: 'x' },
      ],
    ],
    ['accountUpdate', accountUpdateSchema, [{}, { archived: 'sim' }, { name: '' }]],
    [
      'categoryCreate',
      categoryCreateSchema,
      [
        {},
        { name: 1, kind: 1, color: 1, icon: 1 },
        { name: long, kind: 'x', color: 'x', icon: 'x' },
      ],
    ],
    ['categoryUpdate', categoryUpdateSchema, [{}, { name: '' }]],
    [
      'transactionCreate',
      transactionCreateSchema,
      [
        {},
        { type: 'x' },
        { type: 'expense' },
        {
          type: 'income',
          accountId: 1,
          categoryId: 1,
          amount: 'x',
          description: 1,
          date: 1,
          notes: 1,
        },
        {
          type: 'expense',
          accountId: 'x',
          categoryId: 'x',
          amount: 0,
          description: '',
          date: '2026-02-30',
          notes: long,
        },
        {
          type: 'expense',
          accountId: ID_A,
          categoryId: ID_B,
          amount: -1,
          description: long,
          date: 'x',
        },
        { type: 'transfer' },
        {
          type: 'transfer',
          accountId: ID_A,
          toAccountId: 'x',
          amount: 1.5,
          description: 'x',
          date: '2026-11-04',
        },
        {
          type: 'transfer',
          accountId: ID_A,
          toAccountId: ID_A,
          amount: 1,
          description: 'x',
          date: '2026-11-04',
        },
      ],
    ],
    [
      'transactionUpdate',
      transactionUpdateSchema,
      [
        {},
        {
          type: 'x',
          amount: 0,
          description: '',
          date: 'x',
          notes: long,
          accountId: 'x',
          categoryId: 'x',
          toAccountId: 'x',
        },
      ],
    ],
    [
      'budgetUpsert',
      budgetUpsertSchema,
      [
        {},
        { categoryId: 1, month: 1, amount: 'x' },
        { categoryId: 'x', month: '2026-13', amount: -1 },
      ],
    ],
    ['budgetCopy', budgetCopySchema, [{}, { from: 'x', to: 1 }]],
    [
      'recurringCreate',
      recurringCreateSchema,
      [
        {},
        { template: {}, rule: {} },
        {
          template: { type: 'expense' },
          rule: { frequency: 'daily', interval: 0, dayOfMonth: 40, startDate: 'x' },
        },
        {
          template: {
            type: 'expense',
            accountId: ID_A,
            categoryId: ID_B,
            amount: 1,
            description: 'x',
          },
          rule: {
            frequency: 'weekly',
            interval: 1.5,
            dayOfMonth: 1.5,
            startDate: '2026-11-04',
            endDate: '2026-11-01',
          },
        },
        {
          template: {
            type: 'expense',
            accountId: ID_A,
            categoryId: ID_B,
            amount: 1,
            description: 'x',
          },
          rule: { frequency: 'monthly', interval: 1000, startDate: '2026-11-04' },
        },
        {
          template: {
            type: 'expense',
            accountId: ID_A,
            categoryId: ID_B,
            amount: 1,
            description: 'x',
          },
          rule: { frequency: 'weekly', interval: 1, dayOfMonth: 5, startDate: '2026-11-04' },
        },
      ],
    ],
    ['recurringUpdate', recurringUpdateSchema, [{}, { active: 'sim' }]],
    [
      'csvPreview',
      csvImportPreviewRequestSchema,
      [
        {},
        { accountId: ID_A, csv: '' },
        { accountId: ID_A, csv: 1 },
        { accountId: ID_A, csv: 'x', fileName: 1 },
        { accountId: ID_A, rows: [] },
        { accountId: ID_A, rows: [{}] },
        { accountId: ID_A, rows: [{ date: long, description: long, amount: long }] },
      ],
    ],
    [
      'csvCommit',
      csvImportCommitRequestSchema,
      [
        {},
        { accountId: ID_A, rows: [], force: 'sim' },
        {
          accountId: ID_A,
          rows: [{ date: 'x', description: '', type: 'x', amount: 0, categoryId: 'x' }],
        },
      ],
    ],
  ];

  it.each(forms)('%s', (_name, schema, inputs) => {
    const unresolved: string[] = [];
    let total = 0;
    for (const input of inputs) {
      const result = schema.safeParse(input);
      if (result.success) continue;
      for (const issue of result.error.issues) {
        total += 1;
        if (!resolveIssue(issue)) {
          unresolved.push(`${issue.path.join('.') || '(raiz)'} [${issue.code}]: ${issue.message}`);
        }
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(unresolved).toEqual([]);
  });
});

describe('issues do Zod sem mensagem própria e fallback', () => {
  const plain = z.object({
    flag: z.boolean(),
    tags: z.array(z.string()).min(2),
    code: z.string().max(3),
  });

  it('pt-BR mantém a mensagem do Zod; en-US usa validation.generic', () => {
    const issues = plain.safeParse({ flag: 'x', tags: [], code: 'abcd' }).error?.issues ?? [];
    expect(issues.map((issue) => translateIssue(en, issue))).toEqual([
      'Invalid value',
      'The value must be at least 2',
      'The value must be at most 3',
    ]);
    expect(issues.map((issue) => translateIssue(pt, issue))).toEqual(issues.map((i) => i.message));
    const required = z.string().min(1).safeParse('').error?.issues[0];
    expect(required && translateIssue(en, required)).toBe('Required field');
  });

  it('mensagem desconhecida sem código conhecido volta como veio', () => {
    expect(translateIssue(en, { message: 'Algo específico do servidor', code: 'custom' })).toBe(
      'Algo específico do servidor',
    );
    expect(translateIssue(en, {})).toBe('Invalid value');
  });

  it('translateFieldError aceita o FieldError do react-hook-form', () => {
    const fieldError = { type: 'too_small', message: 'A senha deve ter no mínimo 8 caracteres' };
    expect(translateFieldError(en, fieldError)).toBe('The password must be at least 8 characters');
    expect(translateFieldError(en, { type: 'invalid_type', message: 'Entrada inválida' })).toBe(
      'Invalid value',
    );
    expect(translateFieldError(en, undefined)).toBeUndefined();
  });
});
