import { clear, createStore, del, entries, get, set } from 'idb-keyval';
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';
import { queryClient } from '../queryClient';

/**
 * Persistance du cache TanStack Query dans IndexedDB (clé par requête).
 * Au chargement, les données sont restaurées instantanément puis revalidées
 * en arrière-plan — plus de longue page de chargement pendant le réveil du
 * serveur, et consultation possible hors ligne.
 */

// Bumper de cache : à incrémenter quand la forme des données persistées
// change, pour invalider automatiquement les entrées existantes.
export const PERSIST_BUSTER = 'v1';

const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours

const idbStore = createStore('bashkush-cache', 'queries');

// Adaptateur AsyncStorage pour idb-keyval.
const storage = {
  getItem: (key: string) => get<string | undefined>(key, idbStore),
  setItem: (key: string, value: string) => set(key, value, idbStore),
  removeItem: (key: string) => del(key, idbStore),
  entries: () => entries(idbStore) as Promise<Array<[string, string]>>,
};

const persister = experimental_createQueryPersister({
  storage,
  buster: PERSIST_BUSTER,
  maxAge: MAX_AGE,
  prefix: 'bashkush-query',
  // Revalidation arrière-plan dès que les données sont restaurées.
  refetchOnRestore: true,
});

/** Option `persister` à passer aux `useQuery` qu'on veut persistés. */
export const queryPersisterOption = persister.persisterFn;

// ── Propriétaire du cache (changement de compte) ──────────────
// Les clés de cache sont globales (['profile'], ['family']…) : sans cette
// garde, le compte B connecté après le compte A restaurerait les données
// persistées de A depuis IndexedDB (staleTime les jugeant fraîches, aucun
// refetch ne corrigerait avant un rechargement manuel).

const CACHE_OWNER_KEY = 'bashkush:cache-owner';

/** Vide le cache persisté IndexedDB. */
export async function purgePersistedQueries(): Promise<void> {
  try {
    await clear(idbStore);
  } catch {
    // IndexedDB indisponible (navigation privée…) → rien à purger.
  }
}

/** Oublie le propriétaire du cache (déconnexion). */
export function clearCacheOwner(): void {
  try {
    localStorage.removeItem(CACHE_OWNER_KEY);
  } catch {
    // Stockage indisponible : la purge au prochain login s'en chargera.
  }
}

// Les vérifications sont sérialisées : deux événements d'auth simultanés
// (INITIAL_SESSION + getSession au démarrage) ne doivent pas purger en
// même temps qu'une restauration de requête.
let ownerGate: Promise<void> = Promise.resolve();

/**
 * Garantit que le cache (mémoire + IndexedDB) appartient bien à `userId` :
 * à la première session d'un autre compte, tout est purgé pour ne jamais
 * afficher les données du compte précédent.
 */
export function ensureCacheOwner(userId: string): Promise<void> {
  const run = ownerGate.then(async () => {
    let owner: string | null = null;
    try {
      owner = localStorage.getItem(CACHE_OWNER_KEY);
    } catch {
      owner = null; // Stockage indisponible → purge prudente.
    }
    if (owner === userId) return;
    queryClient.clear();
    await purgePersistedQueries();
    try {
      localStorage.setItem(CACHE_OWNER_KEY, userId);
    } catch {
      // Sans stockage, la purge se refera au prochain démarrage.
    }
  });
  ownerGate = run.catch(() => undefined);
  return run;
}
