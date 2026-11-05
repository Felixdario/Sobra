import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categorySchema, tokenPairSchema, userSchema } from '@sobra/shared';
import type { App } from '../../app';
import { authHeader, createTestApp, errorOf, registerUser } from '../../test/helpers';

describe('auth', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const refresh = (refreshToken: string) =>
    app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });

  describe('POST /auth/register', () => {
    it('cria o usuário, devolve tokens e não expõe a senha', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: ' Maria ', email: 'Maria@Exemplo.com ', password: 'senha-forte-123' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.user).toMatchObject({ name: 'Maria', email: 'maria@exemplo.com' });
      expect(body.tokens.expiresIn).toBe(900);
      expect(JSON.stringify(body)).not.toContain('senha-forte-123');
      expect(JSON.stringify(body)).not.toContain('passwordHash');

      const stored = await app.prisma.user.findUniqueOrThrow({ where: { id: body.user.id } });
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('cria as categorias padrão e a conta Carteira', async () => {
      const user = await registerUser(app);

      const categories = (
        await app.inject({ method: 'GET', url: '/categories', headers: authHeader(user) })
      ).json();
      expect(categories.map((c: { name: string }) => c.name).sort()).toEqual(
        [
          'Salário',
          'Freelance',
          'Rendimentos',
          'Moradia',
          'Mercado',
          'Transporte',
          'Restaurantes',
          'Lazer',
          'Saúde',
          'Educação',
          'Assinaturas',
          'Compras',
          'Outros',
        ].sort(),
      );
      for (const category of categories) expect(() => categorySchema.parse(category)).not.toThrow();
      expect(categories.filter((c: { kind: string }) => c.kind === 'income')).toHaveLength(3);

      const accounts = (
        await app.inject({ method: 'GET', url: '/accounts', headers: authHeader(user) })
      ).json();
      expect(accounts).toEqual([
        expect.objectContaining({ name: 'Carteira', type: 'cash', balance: 0, archived: false }),
      ]);
    });

    it('recusa e-mail já cadastrado com 409', async () => {
      const user = await registerUser(app);
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name: 'Outra',
          email: user.user.email.toUpperCase(),
          password: 'outra-senha-123',
        },
      });

      expect(response.statusCode).toBe(409);
      expect(errorOf(response)).toEqual({
        code: 'CONFLICT',
        message: 'Este e-mail já está cadastrado',
      });
    });

    it('valida o corpo com mensagens pt-BR e detalhes por campo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: '', email: 'nao-e-email', password: 'curta' },
      });

      expect(response.statusCode).toBe(400);
      const error = errorOf(response);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Dados inválidos');
      expect(error.details).toEqual(
        expect.arrayContaining([
          { field: 'name', in: 'body', message: 'Informe o nome' },
          { field: 'email', in: 'body', message: 'E-mail inválido' },
          { field: 'password', in: 'body', message: 'A senha deve ter no mínimo 8 caracteres' },
        ]),
      );
    });

    it('usa as mensagens genéricas do Zod em pt-BR', async () => {
      const response = await app.inject({ method: 'POST', url: '/auth/login', payload: {} });

      expect(response.statusCode).toBe(400);
      expect(errorOf(response).details).toEqual(
        expect.arrayContaining([{ field: 'email', in: 'body', message: 'Informe o e-mail' }]),
      );
    });
  });

  describe('POST /auth/login', () => {
    it('entra com a senha certa', async () => {
      const user = await registerUser(app);
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: user.user.email, password: user.password },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().user).toEqual(user.user);
      expect(() => tokenPairSchema.parse(response.json().tokens)).not.toThrow();
    });

    it('responde 401 genérico para senha errada e para e-mail inexistente', async () => {
      const user = await registerUser(app);
      const wrongPassword = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: user.user.email, password: 'senha-errada-123' },
      });
      const unknownEmail = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'ninguem@exemplo.com', password: 'qualquer-senha' },
      });

      for (const response of [wrongPassword, unknownEmail]) {
        expect(response.statusCode).toBe(401);
        expect(errorOf(response)).toEqual({
          code: 'UNAUTHORIZED',
          message: 'E-mail ou senha incorretos',
        });
      }
    });
  });

  describe('GET /me', () => {
    it('devolve o usuário do token', async () => {
      const user = await registerUser(app);
      const response = await app.inject({ method: 'GET', url: '/me', headers: authHeader(user) });

      expect(response.statusCode).toBe(200);
      expect(userSchema.parse(response.json())).toEqual(user.user);
    });

    it('responde 401 sem token, com token inválido e com token assinado por outra chave', async () => {
      const other = await createTestApp({ JWT_SECRET: 'outra-chave-com-pelo-menos-32-caracteres' });
      const foreignToken = other.jwt.sign({ sub: 'qualquer' });
      await other.close();

      const responses = await Promise.all([
        app.inject({ method: 'GET', url: '/me' }),
        app.inject({ method: 'GET', url: '/me', headers: authHeader('abc.def.ghi') }),
        app.inject({ method: 'GET', url: '/me', headers: authHeader(foreignToken) }),
      ]);

      for (const response of responses) {
        expect(response.statusCode).toBe(401);
        expect(errorOf(response).code).toBe('UNAUTHORIZED');
      }
    });

    it('responde 401 com token expirado', async () => {
      const user = await registerUser(app);
      const expired = app.jwt.sign({ sub: user.user.id }, { expiresIn: -10 });
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: authHeader(expired),
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('troca o refresh token por um par novo (rotação)', async () => {
      const user = await registerUser(app);
      const response = await refresh(user.tokens.refreshToken);

      expect(response.statusCode).toBe(200);
      const tokens = tokenPairSchema.parse(response.json());
      expect(tokens.refreshToken).not.toBe(user.tokens.refreshToken);

      const me = await app.inject({
        method: 'GET',
        url: '/me',
        headers: authHeader(tokens.accessToken),
      });
      expect(me.statusCode).toBe(200);

      const next = await refresh(tokens.refreshToken);
      expect(next.statusCode).toBe(200);
    });

    it('guarda só o hash do refresh token', async () => {
      const user = await registerUser(app);
      const rows = await app.prisma.refreshToken.findMany({ where: { userId: user.user.id } });

      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0]?.tokenHash).not.toBe(user.tokens.refreshToken);
    });

    it('reusar um refresh token já trocado derruba a família inteira', async () => {
      const user = await registerUser(app);
      const first = tokenPairSchema.parse((await refresh(user.tokens.refreshToken)).json());

      const replay = await refresh(user.tokens.refreshToken);
      expect(replay.statusCode).toBe(401);
      expect(errorOf(replay)).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Sessão expirada ou inválida. Entre novamente',
      });

      const legit = await refresh(first.refreshToken);
      expect(legit.statusCode).toBe(401);
    });

    it('a revogação por reuso não afeta outras sessões do mesmo usuário', async () => {
      const user = await registerUser(app);
      const otherSession = (
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { email: user.user.email, password: user.password },
        })
      ).json().tokens.refreshToken as string;

      await refresh(user.tokens.refreshToken);
      await refresh(user.tokens.refreshToken);

      expect((await refresh(otherSession)).statusCode).toBe(200);
    });

    it('recusa refresh token desconhecido ou expirado', async () => {
      const user = await registerUser(app);
      await app.prisma.refreshToken.updateMany({
        where: { userId: user.user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      expect((await refresh('token-inventado')).statusCode).toBe(401);
      expect((await refresh(user.tokens.refreshToken)).statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revoga a sessão e é idempotente', async () => {
      const user = await registerUser(app);
      const logout = () =>
        app.inject({
          method: 'POST',
          url: '/auth/logout',
          payload: { refreshToken: user.tokens.refreshToken },
        });

      const first = await logout();
      expect(first.statusCode).toBe(204);
      expect(first.body).toBe('');
      expect((await logout()).statusCode).toBe(204);
      expect((await refresh(user.tokens.refreshToken)).statusCode).toBe(401);
    });
  });
});

describe('rate limit em /auth', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp({ AUTH_RATE_LIMIT_MAX: '2' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 429 no formato de erro depois do limite', async () => {
    const attempt = () =>
      app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'x@exemplo.com', password: 'qualquer-senha' },
      });

    expect((await attempt()).statusCode).toBe(401);
    expect((await attempt()).statusCode).toBe(401);
    const limited = await attempt();

    expect(limited.statusCode).toBe(429);
    expect(errorOf(limited).code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();
  });
});
