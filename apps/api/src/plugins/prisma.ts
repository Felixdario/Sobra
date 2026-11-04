import fp from 'fastify-plugin';
import { createPrismaClient, type PrismaClient } from '../lib/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp<{ sqliteFile: string }>(
  async (app, { sqliteFile }) => {
    const prisma = createPrismaClient(sqliteFile);
    app.decorate('prisma', prisma);
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  },
  { name: 'prisma' },
);
