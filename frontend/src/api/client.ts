import axios from 'axios';
import { supabase } from '../lib/supabase';
import { markApiReachable, markApiUnreachable } from '../offline/connection';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 15000,
});

// Délai max pour obtenir le jeton : avec autoRefreshToken, getSession() peut
// déclencher un refresh réseau (fetch Supabase sans timeout). Le timeout axios
// ne couvre pas le temps passé dans l'intercepteur de requête — sans cette
// garde, une mutation « en ligne » sur un réseau qui cale reste pendante
// indéfiniment (spinner sans fin alors que l'action aurait pu être mise en file).
const AUTH_TIMEOUT_MS = 5_000;

/** Le jeton d'auth n'a pas pu être obtenu à temps (réseau bloqué / refresh pendante). */
export class AuthUnavailableError extends Error {
  constructor() {
    super('Session Supabase indisponible (délai dépassé).');
    this.name = 'AuthUnavailableError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthUnavailableError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
export { withTimeout };

// Attache le jeton Supabase à chaque requête vers l'API.
api.interceptors.request.use(async (config) => {
  let token: string | undefined;
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS);
    token = data.session?.access_token;
  } catch {
    // Refresh réseau impossible (hors ligne, réseau qui cale…) : on ne peut
    // pas envoyer la requête authentifiée → traité comme injoignable par la
    // file offline (voir runOfflineAware).
    throw new AuthUnavailableError();
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Suit la joignabilité du serveur : toute réponse réussie repasse « online »,
// toute erreur sans réponse (timeout/réseau) déclenche la sonde santé
// (réveil du serveur Render + rejeu de la file offline quand il répond).
api.interceptors.response.use(
  (response) => {
    markApiReachable();
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && !error.response) {
      markApiUnreachable();
    }
    return Promise.reject(error);
  },
);

// En dev, avertir si l'URL backend n'est pas configurée.
if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️ VITE_API_URL non défini — utilisation de http://localhost:4000. Copiez .env.example en .env si besoin.',
  );
}

/** Extrait un message d'erreur lisible d'une réponse API échouée. */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
