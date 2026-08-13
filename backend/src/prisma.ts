import { PrismaClient } from '@prisma/client';

/**
 * Singleton du client Prisma.
 * Réutilise l'instance en dev (hot-reload) pour éviter d'épuiser les connexions.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
