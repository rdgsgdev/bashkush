import axios from 'axios';
import { connectionState, useConnectionStore } from './connectionStore';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`;

// Requête brute : /health est public (pas d'intercepteur d'auth).
// Timeout long : sur le free tier de Render, c'est cette requête qui réveille
// le serveur (le spin-up peut prendre plusieurs dizaines de secondes).
const healthApi = axios.create({ timeout: 60_000 });

const PROBE_INTERVAL = 5_000;
let probeTimer: ReturnType<typeof setInterval> | null = null;
let probing = false;

async function probeOnce() {
  if (probing) return;
  probing = true;
  try {
    await healthApi.get(`${API_BASE}/health`);
    // Le serveur répond : on arrête la sonde, on passe en ligne et on rejoue
    // la file d'actions offline.
    stopHealthProbe();
    const st = connectionState();
    if (st.status !== 'online' && navigator.onLine) {
      st.setStatus('online');
    }
    // Import dynamique pour éviter une dépendance circulaire queue ⇄ connection.
    const { flushQueue } = await import('./queue');
    void flushQueue();
  } catch {
    // Toujours injoignable : la sonde relancera (interval ci-dessous).
  } finally {
    probing = false;
  }
}

/** Lance la sonde santé (no-op si déjà active ou réseau coupé). */
export function startHealthProbe() {
  if (!navigator.onLine) return;
  if (probeTimer) return;
  void probeOnce();
  probeTimer = setInterval(() => void probeOnce(), PROBE_INTERVAL);
}

export function stopHealthProbe() {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}

/** Signale une erreur réseau sur l'API : dégradation + lancement de la sonde. */
export function markApiUnreachable() {
  const st = connectionState();
  if (st.status !== 'offline') {
    st.setStatus(navigator.onLine ? 'server-down' : 'offline');
  }
  startHealthProbe();
}

/** Signale qu'une requête API vient de réussir. */
export function markApiReachable() {
  const st = connectionState();
  if (st.status !== 'online') {
    st.setStatus('online');
    // Des actions ont pu être mises en file pendant l'indétermination ou
    // l'indisponibilité : on rejoue la file dès qu'on repasse en ligne.
    // (La sonde santé déclenche aussi un rejeu ; les deux sont idempotents.)
    void import('./queue').then(({ flushQueue }) => flushQueue());
  }
  stopHealthProbe();
}

/** Rétablit l'état initial (testé au montage de l'app). */
export function initConnection() {
  const setStatus = useConnectionStore.getState().setStatus;
  if (!navigator.onLine) {
    setStatus('offline');
  } else {
    startHealthProbe();
  }

  window.addEventListener('online', () => {
    // Réseau revenu, mais le serveur n'est pas encore confirmé : on sonde.
    setStatus('server-down');
    startHealthProbe();
  });
  window.addEventListener('offline', () => {
    setStatus('offline');
    stopHealthProbe();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const { status } = connectionState();
      if (status !== 'online') startHealthProbe();
    }
  });

  // Compte d'actions en attente au démarrage (rechargement hors ligne).
  void import('./queue').then(({ refreshPendingCount }) => refreshPendingCount());
}
