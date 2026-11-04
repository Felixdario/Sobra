import { z } from 'zod';
import { idSchema, isoDateTimeSchema, nameSchema } from './common';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const emailSchema = z
  .string({ error: 'Informe o e-mail' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido' }));

export const passwordSchema = z
  .string({ error: 'Informe a senha' })
  .min(PASSWORD_MIN, { error: `A senha deve ter no mínimo ${PASSWORD_MIN} caracteres` })
  .max(PASSWORD_MAX, { error: `A senha deve ter no máximo ${PASSWORD_MAX} caracteres` });

export const registerSchema = z.object({
  name: nameSchema(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Informe a senha' }).min(1, { error: 'Informe a senha' }),
});

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.int().positive(),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ error: 'Token de renovação ausente' }).min(1, {
    error: 'Token de renovação ausente',
  }),
});

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.email(),
  createdAt: isoDateTimeSchema,
});

export const authResponseSchema = z.object({
  user: userSchema,
  tokens: tokenPairSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
