import { randomUUID } from 'node:crypto';
import {
  DEFAULT_LOCALE,
  type AuthResponse,
  type DisplayCurrency,
  type Locale,
  type LoginInput,
  type RegisterInput,
  type TokenPair,
  type User,
  type UserPreferencesUpdate,
} from '@sobra/shared';
import { type Db, isUniqueViolation, type PrismaClient } from '../../lib/db';
import { conflict, unauthorized } from '../../lib/errors';
import { compact } from '../../lib/objects';
import { defaultAccount, defaultCategories } from './defaults';
import type { PasswordHasher } from './password';
import { generateRefreshToken, hashRefreshToken } from './tokens';

export type AuthContext = {
  prisma: PrismaClient;
  signAccessToken: (userId: string) => string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  passwords: PasswordHasher;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = 'E-mail ou senha incorretos';
export const INVALID_REFRESH = 'Sessão expirada ou inválida. Entre novamente';

type UserRow = {
  id: string;
  name: string;
  email: string;
  locale: string;
  currency: string;
  createdAt: Date;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  // Only the API writes these columns, always through the shared enums; the response schema
  // checks them again on the way out.
  locale: row.locale as Locale,
  currency: row.currency as DisplayCurrency,
  createdAt: row.createdAt.toISOString(),
});

async function issueTokens(
  ctx: AuthContext,
  db: Db,
  userId: string,
  familyId: string = randomUUID(),
): Promise<{ tokens: TokenPair; refreshTokenId: string }> {
  const refreshToken = generateRefreshToken();
  const record = await db.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + ctx.refreshTokenTtlDays * DAY_MS),
    },
  });
  return {
    tokens: {
      accessToken: ctx.signAccessToken(userId),
      refreshToken,
      expiresIn: ctx.accessTokenTtlSeconds,
    },
    refreshTokenId: record.id,
  };
}

const revokeFamily = (db: Db, familyId: string) =>
  db.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

/**
 * Creates the user with the default categories and account, named in `locale` (pt-BR when
 * absent). Run it inside a transaction.
 */
export async function createUserWithDefaults(
  db: Db,
  input: { name: string; email: string; passwordHash: string; locale?: Locale | undefined },
): Promise<UserRow> {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const user = await db.user.create({ data: { ...input, locale } });
  await db.category.createMany({
    data: defaultCategories(locale).map((category) => ({ ...category, userId: user.id })),
  });
  await db.account.create({ data: { ...defaultAccount(locale), userId: user.id } });
  return user;
}

export async function register(ctx: AuthContext, input: RegisterInput): Promise<AuthResponse> {
  const passwordHash = await ctx.passwords.hash(input.password);
  try {
    return await ctx.prisma.$transaction(async (tx) => {
      const user = await createUserWithDefaults(tx, {
        name: input.name,
        email: input.email,
        passwordHash,
        locale: input.locale,
      });
      const { tokens } = await issueTokens(ctx, tx, user.id);
      return { user: toUser(user), tokens };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict('Este e-mail já está cadastrado');
    throw error;
  }
}

export async function login(ctx: AuthContext, input: LoginInput): Promise<AuthResponse> {
  const user = await ctx.prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await ctx.passwords.burnCheck(input.password);
    throw unauthorized(INVALID_CREDENTIALS);
  }
  if (!(await ctx.passwords.verify(user.passwordHash, input.password))) {
    throw unauthorized(INVALID_CREDENTIALS);
  }
  const { tokens } = await issueTokens(ctx, ctx.prisma, user.id);
  return { user: toUser(user), tokens };
}

/**
 * Rotates the refresh token. Presenting a token that was already used means it leaked or was
 * replayed, so the whole family is revoked and every session in it must log in again.
 */
export async function refresh(ctx: AuthContext, refreshToken: string): Promise<TokenPair> {
  const current = await ctx.prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
  });
  if (!current) throw unauthorized(INVALID_REFRESH);

  const now = new Date();
  const claimed = current.revokedAt
    ? 0
    : (
        await ctx.prisma.refreshToken.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: now },
        })
      ).count;

  if (claimed === 0) {
    await revokeFamily(ctx.prisma, current.familyId);
    throw unauthorized(INVALID_REFRESH);
  }
  if (current.expiresAt <= now) throw unauthorized(INVALID_REFRESH);

  return ctx.prisma.$transaction(async (tx) => {
    const { tokens, refreshTokenId } = await issueTokens(ctx, tx, current.userId, current.familyId);
    await tx.refreshToken.update({
      where: { id: current.id },
      data: { replacedById: refreshTokenId },
    });
    return tokens;
  });
}

export async function logout(ctx: AuthContext, refreshToken: string): Promise<void> {
  const current = await ctx.prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
  });
  if (current) await revokeFamily(ctx.prisma, current.familyId);
}

const USER_NOT_FOUND = 'Usuário não encontrado';

export async function getProfile(db: Db, userId: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized(USER_NOT_FOUND);
  return toUser(user);
}

/** Saves the given preferences (validated by `userPreferencesUpdateSchema`) and returns the user. */
export async function updatePreferences(
  db: Db,
  userId: string,
  input: UserPreferencesUpdate,
): Promise<User> {
  const { count } = await db.user.updateMany({ where: { id: userId }, data: compact(input) });
  if (count === 0) throw unauthorized(USER_NOT_FOUND);
  return getProfile(db, userId);
}
