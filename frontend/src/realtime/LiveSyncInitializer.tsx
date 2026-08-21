import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../queryClient';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Préfixes de clés de cache que le serveur est autorisé à invalider.
const VALID_KEYS = new Set(['meals', 'mealPlans', 'grocery', 'aisles', 'family', 'settings', 'lists', 'productScans']);

/**
 * Synchronisation temps réel (Socket.io) :
 * - connecté avec le jeton Supabase de la session ; le serveur place le
 *   socket dans la salle de la famille à la poignée de main ;
 * - chaque événement `invalidate` rafraîchit les requêtes concernées →
 *   les modifications des autres membres apparaissent sans rechargement ;
 * - à la reconnexion (ex. sortie de veille du serveur), les événements
 *   émis pendant la coupure sont perdus → refetch global de rattrapage ;
 * - si l'utilisateur change de famille (invitation acceptée), on force une
 *   reconnexion pour rejoindre la salle de la nouvelle famille.
 */
export function LiveSyncInitializer() {
  const session = useAuthStore((s) => s.session);
  const token = session?.access_token;
  const socketRef = useRef<Socket | null>(null);
  const familyIdRef = useRef<string | null>(null);

  // Connexion / déconnexion suivant la session.
  useEffect(() => {
    if (!token) return;

    const socket = io(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('invalidate', ({ keys }: { keys: string[] }) => {
      for (const key of keys) {
        if (VALID_KEYS.has(key)) queryClient.invalidateQueries({ queryKey: [key] });
      }
    });

    socket.io.on('reconnect', () => {
      queryClient.invalidateQueries();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Changement de famille → nouvelle poignée de main → nouvelle salle.
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    return cache.subscribe((event) => {
      if (event.type !== 'updated' || event.query.queryKey[0] !== 'profile') return;
      const familyId = (event.query.state.data as { familyId?: string } | undefined)?.familyId;
      if (!familyId || familyId === familyIdRef.current) return;
      const changed = familyIdRef.current !== null;
      familyIdRef.current = familyId;
      if (changed) socketRef.current?.disconnect().connect();
    });
  }, []);

  return null;
}
