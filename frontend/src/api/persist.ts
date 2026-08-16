import { createStore, del, entries, get, set } from 'idb-keyval';
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';

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
