import { useSyncExternalStore } from 'react';

/** Seuil desktop : même valeur que le breakpoint `lg` de Tailwind. */
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

/**
 * Vrai si le viewport est « desktop » (≥ 1024px) : layout avec menu latéral
 * gauche + side panel droit pour les modales. Réactif au redimensionnement.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}
