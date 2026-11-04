import { createHash, randomBytes } from 'node:crypto';

export const generateRefreshToken = (): string => randomBytes(32).toString('base64url');

/** Refresh tokens carry 256 random bits, so a fast hash is enough (no salt or KDF needed). */
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
