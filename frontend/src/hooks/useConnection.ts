import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../offline/connectionStore';

/** Accès React à l'état de connexion (bannière, gating des actions en ligne). */
export function useConnection() {
  return useConnectionStore(
    useShallow((s) => ({
      status: s.status,
      pendingActions: s.pendingActions,
      syncing: s.syncing,
      lastSyncedAt: s.lastSyncedAt,
    })),
  );
}
