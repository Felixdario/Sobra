import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { Prisma, PrismaClient } from '../generated/prisma/client';

export { Prisma, PrismaClient };

/** Accepted by services so they run both standalone and inside `prisma.$transaction`. */
export type Db = Prisma.TransactionClient;

export function createPrismaClient(sqliteFile: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteFile }) });
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
