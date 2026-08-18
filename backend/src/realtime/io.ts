import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { supabase } from '../config/supabase';
import { ensureFamilyId } from '../lib/family';
import { corsOrigins } from '../config/env';

// ─────────────────────────────────────────────────────────────
// Temps réel (Socket.io) — synchronisation live entre membres
// d'une même famille : chaque mutation émet une invalidation de
// cache vers les autres clients, qui rafraîchissent leurs
// requêtes React Query sans rechargement de page.
// ─────────────────────────────────────────────────────────────

/** Clés de cache frontend concernées par une invalidation (préfixes TanStack Query). */
export type InvalidateKey = 'meals' | 'mealPlans' | 'grocery' | 'aisles' | 'family' | 'settings' | 'lists';

let io: Server | null = null;

/** Crée le serveur Socket.io sur le serveur HTTP existant. */
export function initRealtime(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'] },
  });

  // Même auth que l'API REST : jeton Supabase transmis à la poignée de main.
  // Une fois la famille résolue, le socket rejoint sa salle dédiée.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token.length === 0) {
        return next(new Error('Authentification requise'));
      }
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return next(new Error('Session invalide ou expirée'));
      }
      socket.data.familyId = await ensureFamilyId(data.user.id, data.user.email ?? null);
      next();
    } catch {
      next(new Error('Session invalide ou expirée'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`family:${socket.data.familyId}`);
  });

  return io;
}

/**
 * Signale aux clients de la famille que des données ont changé.
 * Appelé par les contrôleurs après chaque mutation réussie.
 */
export function emitFamilyInvalidation(familyId: string, keys: InvalidateKey[]) {
  io?.to(`family:${familyId}`).emit('invalidate', { keys });
}

/**
 * Invalidation globale — pour les entités NON scopées à une famille
 * (ex. le catalogue des rayons).
 */
export function emitAllInvalidation(keys: InvalidateKey[]) {
  io?.emit('invalidate', { keys });
}

/** Ferme le serveur temps réel (arrêt propre). */
export function closeRealtime(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
    io = null;
  });
}
