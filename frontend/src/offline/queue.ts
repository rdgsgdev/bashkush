import axios from 'axios';
import { createStore, get, set } from 'idb-keyval';
import { supabase } from '../lib/supabase';
import { AuthUnavailableError, withTimeout } from '../api/client';
import { queryClient } from '../queryClient';
import { connectionState } from './connectionStore';
import { markApiReachable, markApiUnreachable } from './connection';

/**
 * File d'actions offline (IndexedDB).
 * Quand l'API est injoignable (pas de réseau ou serveur Render en veille),
 * les mutations « queueables » sont stockées ici puis rejouées dans l'ordre
 * dès que la sonde santé constate le retour du serveur.
 */

const QUEUE_KEY = 'bashkush:offline-queue';
const queueStore = createStore('bashkush-offline', 'queue');

// Instance dédiée au rejeu : même base + auth que `api`, mais sans les
// intercepteurs de statut (le rejeu pilote lui-même l'état de connexion).
const syncApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`,
  timeout: 20_000,
});
syncApi.interceptors.request.use(async (config) => {
  let token: string | undefined;
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 5_000);
    token = data.session?.access_token;
  } catch {
    // Refresh impossible au moment du rejeu : l'action reste en file, la
    // sonde santé relancera le rejeu plus tard.
    throw new AuthUnavailableError();
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type QueueableMethod = 'post' | 'put' | 'patch' | 'delete';

export interface QueuedAction {
  id: string;
  method: QueueableMethod;
  url: string;
  body?: unknown;
  /** Clés de requête à invalider après un rejeu réussi. */
  invalidates?: unknown[][];
  /** Description lisible (journal / UI de synchronisation). */
  label: string;
  createdAt: number;
}

async function loadQueue(): Promise<QueuedAction[]> {
  try {
    return (await get<QueuedAction[]>(QUEUE_KEY, queueStore)) ?? [];
  } catch {
    // IndexedDB indisponible (navigation privée stricte…) : file vide en RAM.
    return [];
  }
}

async function persistQueue(queue: QueuedAction[]) {
  try {
    await set(QUEUE_KEY, queue, queueStore);
  } catch {
    // Même en cas d'échec de persistance, on garde le compte à jour côté UI.
  }
  connectionState().setPendingActions(queue.length);
}

/** Rafraîchit le compteur d'actions en attente (au démarrage de l'app). */
export async function refreshPendingCount() {
  const queue = await loadQueue();
  connectionState().setPendingActions(queue.length);
  return queue.length;
}

/** Vide la file (déconnexion : les actions sont liées au compte). */
export async function clearQueue() {
  await persistQueue([]);
}

export async function enqueue(input: {
  method: QueueableMethod;
  url: string;
  body?: unknown;
  invalidates?: unknown[][];
  label: string;
}): Promise<QueuedAction> {
  const action: QueuedAction = { id: crypto.randomUUID(), createdAt: Date.now(), ...input };
  const queue = await loadQueue();
  await persistQueue([...queue, action]);
  return action;
}

let flushing = false;

/**
 * Rejoue la file dans l'ordre FIFO dès que le serveur répond.
 * Règles par action : 2xx = ok · 404 = ok (déjà supprimé côté serveur) ·
 * 401 = jeton possiblement expiré → on garde tout et on retente (le refresh
 * automatique Supabase rétablit le jeton) · autre 4xx = abandonnée (conflit
 * durable) · 5xx ou erreur réseau = on garde l'action et on arrête (la sonde
 * santé relancera le rejeu plus tard).
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  const queue = await loadQueue();
  if (queue.length === 0) return;
  flushing = true;
  const st = connectionState();
  st.setSyncing(true);

  const remaining: QueuedAction[] = [];
  const toInvalidate = new Set<string>();
  let aborted = false;
  let authStalled = false;

  for (const action of queue) {
    if (aborted) {
      remaining.push(action);
      continue;
    }
    try {
      await syncApi.request({ method: action.method, url: action.url, data: action.body });
      action.invalidates?.forEach((key) => toInvalidate.add(JSON.stringify(key)));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        if (status === 401) {
          // Jeton peut-être expiré après une longue période hors ligne :
          // on n'abandonne rien, le refresh Supabase doit rétablir la session.
          authStalled = true;
          aborted = true;
          remaining.push(action);
        } else if (status >= 400 && status < 500) {
          // 404 : déjà absent côté serveur → considéré synchronisé.
          // Autres 4xx : conflit durable (validation…) → on abandonne l'action.
          // eslint-disable-next-line no-console
          console.warn(`[offline] Action abandonnée (HTTP ${status}) : ${action.label}`);
          action.invalidates?.forEach((key) => toInvalidate.add(JSON.stringify(key)));
        } else {
          aborted = true;
          remaining.push(action);
        }
      } else {
        // Erreur réseau : le serveur est redevenu injoignable.
        aborted = true;
        remaining.push(action);
      }
    }
  }

  await persistQueue(remaining);
  st.setSyncing(false);

  if (aborted) {
    if (!authStalled) {
      markApiUnreachable();
    } else {
      // Serveur joignable mais session à rafraîchir : nouvelle tentative
      // dans quelques secondes (autoRefreshToken de Supabase tourne).
      setTimeout(() => void flushQueue(), 8_000);
    }
  } else {
    markApiReachable();
    if (remaining.length === 0) st.markSynced();
  }

  // Rafraîchit les vues concernées par les actions rejouées/abandonnées.
  for (const key of toInvalidate) {
    try {
      queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
    } catch {
      // Clé non sérialisable : ignorée (n'arrive pas avec les clés du projet).
    }
  }
  flushing = false;
}

/**
 * Exécute une requête « queueable » :
 * - statut autre que 'online' (hors ligne, serveur en veille, sonde de
 *   démarrage en cours) → mise en file immédiate + réponse synthétique
 *   (les updates optimistes restent en place, aucun temps d'attente) ;
 * - en ligne → vraie requête, avec repli sur la file en cas d'erreur réseau
 *   (timeout, serveur en veille) ou de jeton d'auth non obtenu à temps
 *   (AuthUnavailableError — refresh Supabase bloqué par le réseau) ;
 * - erreur HTTP réelle (4xx/5xx) → remontée normalement aux hooks.
 */
export async function runOfflineAware<T>(opts: {
  method: QueueableMethod;
  url: string;
  body?: unknown;
  invalidates?: unknown[][];
  label: string;
  /** Réponse de substitution renvoyée quand l'action est mise en file. */
  synthetic: () => T;
  /** La vraie requête axios. */
  request: () => Promise<T>;
}): Promise<T> {
  const { status } = connectionState();
  if (status !== 'online') {
    await enqueue({
      method: opts.method,
      url: opts.url,
      body: opts.body,
      invalidates: opts.invalidates,
      label: opts.label,
    });
    return opts.synthetic();
  }
  try {
    return await opts.request();
  } catch (err) {
    const unreachable =
      (axios.isAxiosError(err) && !err.response) || err instanceof AuthUnavailableError;
    if (unreachable) {
      markApiUnreachable();
      await enqueue({
        method: opts.method,
        url: opts.url,
        body: opts.body,
        invalidates: opts.invalidates,
        label: opts.label,
      });
      return opts.synthetic();
    }
    throw err;
  }
}
