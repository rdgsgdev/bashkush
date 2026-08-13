import { app } from './app';
import { env } from './config/env';
import { prisma } from './prisma';
import { ensureBucket } from './lib/storage';

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Bashkush API démarrée sur http://localhost:${env.PORT} (${env.NODE_ENV})`);
  // Auto-crée le bucket Storage (non bloquant).
  ensureBucket().catch(() => undefined);
});

// Arrêt propre : on ferme le serveur et la connexion Prisma.
async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} reçu — arrêt en cours…`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
