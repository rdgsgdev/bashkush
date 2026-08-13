import { app } from './app';
import { env } from './config/env';
import { prisma } from './prisma';
import { ensureBucket } from './lib/storage';

/** Avertit si DATABASE_URL utilise le pooleur de transaction (6543) qui casse les transactions Prisma. */
function warnIfTransactionPooler() {
  const url = env.DATABASE_URL;
  const isTxPooler = /:6543(\/|$|\?)/.test(url);
  const hasPgBouncer = /[?&]pgbouncer=true/i.test(url);
  if (isTxPooler || hasPgBouncer) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  DATABASE_URL semble utiliser le POOLEUR DE TRANSACTION (port 6543 / pgbouncer=true).\n' +
        '   Les transactions Prisma interactives échoueront avec P2028 (« Transaction not found »)\n' +
        '   lors de la planification. Remplacez par le POOLEUR DE SESSION (port 5432), SANS ?pgbouncer=true :\n' +
        '   postgresql://postgres.<REF>:<MDP>@aws-0-<REGION>.pooler.supabase.com:5432/postgres',
    );
  }
}

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Bashkush API démarrée sur http://localhost:${env.PORT} (${env.NODE_ENV})`);
  warnIfTransactionPooler();
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

// Visibilité des erreurs non interceptées (sinon silencieuses en prod).
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('‼️ Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('‼️ Uncaught exception:', err);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
