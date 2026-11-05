import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountSchema,
  categorySchema,
  csvImportPreviewSchema,
  spendingByCategorySchema,
  transactionSchema,
  userSchema,
} from '@sobra/shared';
import type { App } from '../../app';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';

describe('preferências e idioma (ADR-035)', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const as =
    (user: TestUser | null) =>
    (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object, headers: object = {}) =>
      app.inject({
        method,
        url,
        headers: { ...(user ? authHeader(user) : {}), ...headers },
        ...(payload && { payload }),
      });

  const categoriesOf = async (user: TestUser) =>
    categorySchema.array().parse((await as(user)('GET', '/categories')).json());

  describe('cadastro', () => {
    it('sem locale: pt-BR/BRL, categorias padrão em pt-BR com systemKey', async () => {
      const user = await registerUser(app);
      expect(user.user).toMatchObject({ locale: 'pt-BR', currency: 'BRL' });

      const categories = await categoriesOf(user);
      expect(categories).toHaveLength(13);
      expect(categories.find((c) => c.systemKey === 'groceries')).toMatchObject({
        name: 'Mercado',
        kind: 'expense',
      });
      expect(categories.every((c) => c.systemKey !== null)).toBe(true);
    });

    it('com o idioma do aparelho: resolve para en-US e cria nomes padrão em inglês', async () => {
      const user = await registerUser(app, { locale: 'en-GB' });
      expect(user.user).toMatchObject({ locale: 'en-US', currency: 'BRL' });

      const categories = await categoriesOf(user);
      expect(categories.find((c) => c.systemKey === 'groceries')?.name).toBe('Groceries');
      expect(categories.find((c) => c.systemKey === 'salary')).toMatchObject({
        name: 'Salary',
        kind: 'income',
      });

      const accounts = accountSchema.array().parse((await as(user)('GET', '/accounts')).json());
      expect(accounts.map((a) => a.name)).toEqual(['Wallet']);
    });

    it('idioma não suportado cai no padrão; valor que não é texto é recusado', async () => {
      const fr = await registerUser(app, { locale: 'fr-FR' });
      expect(fr.user.locale).toBe('pt-BR');

      const response = await as(null)('POST', '/auth/register', {
        name: 'X',
        email: 'x-locale@exemplo.com',
        password: 'senha-super-secreta',
        locale: 42,
      });
      expect(response.statusCode).toBe(400);
      expect(errorOf(response).code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /me e PATCH /me/preferences', () => {
    it('lê e atualiza idioma e moeda, juntos ou separados', async () => {
      const user = await registerUser(app);
      const api = as(user);

      expect(userSchema.parse((await api('GET', '/me')).json())).toMatchObject({
        locale: 'pt-BR',
        currency: 'BRL',
      });

      const both = await api('PATCH', '/me/preferences', { locale: 'en-US', currency: 'USD' });
      expect(both.statusCode).toBe(200);
      expect(userSchema.parse(both.json())).toMatchObject({
        id: user.user.id,
        email: user.user.email,
        locale: 'en-US',
        currency: 'USD',
      });

      const currencyOnly = await api('PATCH', '/me/preferences', { currency: 'EUR' });
      expect(currencyOnly.json()).toMatchObject({ locale: 'en-US', currency: 'EUR' });

      expect((await api('GET', '/me')).json()).toMatchObject({ locale: 'en-US', currency: 'EUR' });
    });

    it.each([
      [{ locale: 'en' }, 'locale'],
      [{ locale: 'fr-FR' }, 'locale'],
      [{ currency: 'GBP' }, 'currency'],
      [{ currency: 'usd' }, 'currency'],
      [{}, ''],
    ])('recusa %j com 400 e o campo em details', async (payload, field) => {
      const user = await registerUser(app);
      const response = await as(user)('PATCH', '/me/preferences', payload);
      expect(response.statusCode).toBe(400);
      const error = errorOf(response);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field, in: 'body' })]),
      );
      expect((await as(user)('GET', '/me')).json()).toMatchObject({
        locale: 'pt-BR',
        currency: 'BRL',
      });
    });

    it('exige autenticação', async () => {
      const response = await as(null)('PATCH', '/me/preferences', { locale: 'en-US' });
      expect(response.statusCode).toBe(401);
      expect(errorOf(response).code).toBe('UNAUTHORIZED');
    });

    it('cada usuário só muda as próprias preferências', async () => {
      const alice = await registerUser(app);
      const bob = await registerUser(app);

      await as(alice)('PATCH', '/me/preferences', { locale: 'en-US', currency: 'USD' });

      expect((await as(bob)('GET', '/me')).json()).toMatchObject({
        locale: 'pt-BR',
        currency: 'BRL',
      });
      const login = await as(null)('POST', '/auth/login', {
        email: alice.user.email,
        password: alice.password,
      });
      expect(login.json().user).toMatchObject({ locale: 'en-US', currency: 'USD' });
    });
  });

  describe('categorias padrão', () => {
    it('renomear limpa o systemKey; mudar cor ou repetir o nome mantém', async () => {
      const user = await registerUser(app);
      const api = as(user);
      const groceries = (await categoriesOf(user)).find((c) => c.systemKey === 'groceries');
      if (!groceries) throw new Error('sem categoria padrão');
      const url = `/categories/${groceries.id}`;

      expect((await api('PATCH', url, { color: '#112233' })).json().systemKey).toBe('groceries');
      expect((await api('PATCH', url, { name: 'Mercado' })).json().systemKey).toBe('groceries');

      const renamed = await api('PATCH', url, { name: 'Feira' });
      expect(renamed.json()).toMatchObject({ name: 'Feira', systemKey: null });
      // Going back to the old name does not bring the key back: it is the user's name now.
      expect((await api('PATCH', url, { name: 'Mercado' })).json().systemKey).toBeNull();
    });

    it('categoria criada pelo usuário não tem systemKey nem aceita um', async () => {
      const user = await registerUser(app);
      const response = await as(user)('POST', '/categories', {
        name: 'Pets',
        kind: 'expense',
        color: '#d97706',
        icon: 'paw',
        systemKey: 'groceries',
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().systemKey).toBeNull();
    });

    it('o systemKey vem embutido nas transações e no resumo por categoria', async () => {
      const user = await registerUser(app, { locale: 'en-US' });
      const api = as(user);
      const [account] = accountSchema.array().parse((await api('GET', '/accounts')).json());
      const groceries = (await categoriesOf(user)).find((c) => c.systemKey === 'groceries');

      const created = await api('POST', '/transactions', {
        type: 'expense',
        accountId: account?.id,
        categoryId: groceries?.id,
        amount: 4590,
        description: 'Supermarket',
        date: '2026-11-04',
      });
      expect(created.statusCode).toBe(201);
      const tx = transactionSchema.parse(created.json());
      expect(tx.category).toMatchObject({ name: 'Groceries', systemKey: 'groceries' });

      const spending = spendingByCategorySchema.parse(
        (await api('GET', '/summary/spending-by-category?month=2026-11')).json(),
      );
      expect(spending.items[0]).toMatchObject({ systemKey: 'groceries', amount: 4590 });
    });

    it('a importação sugere a categoria padrão pelo systemKey também para quem usa en-US', async () => {
      const user = await registerUser(app, { locale: 'en-US' });
      const api = as(user);
      const [account] = accountSchema.array().parse((await api('GET', '/accounts')).json());
      const groceries = (await categoriesOf(user)).find((c) => c.systemKey === 'groceries');

      const response = await api('POST', '/imports/csv/preview', {
        accountId: account?.id,
        csv: 'Data;Descrição;Valor\n03/10/2026;SUPERMERCADO BOM PRECO;-387,45',
      });
      expect(response.statusCode, response.body).toBe(200);
      const [row] = csvImportPreviewSchema.parse(response.json()).rows;
      expect(row?.suggestedCategoryId).toBe(groceries?.id);
    });
  });

  describe('mensagens de erro', () => {
    it('code estável e message pt-BR, qualquer que seja o Accept-Language', async () => {
      const response = await as(null)('GET', '/me', undefined, { 'accept-language': 'en-US' });
      expect(response.statusCode).toBe(401);
      expect(errorOf(response)).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Token de acesso ausente, inválido ou expirado',
      });
    });
  });
});
