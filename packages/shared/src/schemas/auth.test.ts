import { describe, expect, it } from 'vitest';
import {
  authResponseSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  tokenPairSchema,
  userSchema,
} from './auth';

const validRegister = { name: '  Ana Souza ', email: ' Ana@Example.COM ', password: 'segredo123' };

describe('registerSchema', () => {
  it('trims the name and normalizes the e-mail', () => {
    expect(registerSchema.parse(validRegister)).toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'segredo123',
    });
  });

  it('rejects an invalid e-mail in pt-BR', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'ana@' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['email'], message: 'E-mail inválido' });
  });

  it('rejects a short password in pt-BR', () => {
    const result = registerSchema.safeParse({ ...validRegister, password: '1234567' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['password'],
      message: 'A senha deve ter no mínimo 8 caracteres',
    });
  });

  it('rejects a blank name and a password over the hashing limit', () => {
    expect(
      registerSchema.safeParse({ ...validRegister, name: '   ' }).error?.issues[0]?.message,
    ).toBe('Informe o nome');
    expect(registerSchema.safeParse({ ...validRegister, password: 'a'.repeat(129) }).success).toBe(
      false,
    );
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: 'x' }).success).toBe(true);
  });

  it('requires both fields', () => {
    const result = loginSchema.safeParse({ email: 'ana@example.com', password: '' });
    expect(result.error?.issues[0]?.message).toBe('Informe a senha');
    expect(loginSchema.safeParse({ password: 'x' }).success).toBe(false);
  });
});

describe('token schemas', () => {
  const tokens = { accessToken: 'a.b.c', refreshToken: 'r', expiresIn: 900 };

  it('accepts a token pair and a refresh body', () => {
    expect(tokenPairSchema.parse(tokens)).toEqual(tokens);
    expect(refreshSchema.parse({ refreshToken: 'r' })).toEqual({ refreshToken: 'r' });
  });

  it('rejects a non-positive expiresIn and an empty refresh token', () => {
    expect(tokenPairSchema.safeParse({ ...tokens, expiresIn: 0 }).success).toBe(false);
    expect(refreshSchema.safeParse({ refreshToken: '' }).error?.issues[0]?.message).toBe(
      'Token de renovação ausente',
    );
  });
});

describe('userSchema', () => {
  const user = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    name: 'Ana',
    email: 'ana@example.com',
    createdAt: '2026-11-04T12:00:00.000Z',
  };

  it('never exposes the password hash', () => {
    const parsed = userSchema.parse({ ...user, passwordHash: '$2b$10$...' });
    expect(parsed).toEqual(user);
    expect(parsed).not.toHaveProperty('passwordHash');
  });

  it('is embedded in the auth response', () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', expiresIn: 900 };
    expect(authResponseSchema.safeParse({ user, tokens }).success).toBe(true);
  });
});
