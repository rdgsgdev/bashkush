import { create } from 'zustand';

/**
 * État de connexion à l'API :
 * - 'checking'     : état initial, sonde santé en cours ;
 * - 'online'       : le serveur répond ;
 * - 'server-down'  : réseau OK mais l'API injoignable (Render en veille…) ;
 * - 'offline'      : pas de réseau (navigator.onLine === false).
 */
export type ConnectionStatus = 'checking' | 'online' | 'server-down' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  /** Nombre d'actions en attente de synchronisation (file offline). */
  pendingActions: number;
  /** Vrai pendant le rejeu de la file vers le serveur. */
  syncing: boolean;
  /** Date du dernier rejeu complet réussi. */
  lastSyncedAt: Date | null;
  setStatus: (status: ConnectionStatus) => void;
  setPendingActions: (n: number) => void;
  setSyncing: (syncing: boolean) => void;
  markSynced: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'checking',
  pendingActions: 0,
  syncing: false,
  lastSyncedAt: null,
  setStatus: (status) => set({ status }),
  setPendingActions: (pendingActions) => set({ pendingActions }),
  setSyncing: (syncing) => set({ syncing }),
  markSynced: () => set({ lastSyncedAt: new Date() }),
}));

/** Accès hors React (intercepteurs axios, file de sync…). */
export const connectionState = () => useConnectionStore.getState();
