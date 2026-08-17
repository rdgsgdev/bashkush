// Aides partagées pour le drag & drop de la liste de courses.

let lastDragEndAt = 0;

/** À appeler à la fin d'un drag : supprime le clic parasite qui suit. */
export function markDragEnd() {
  lastDragEndAt = Date.now();
}

/** Vrai si un drag vient de se terminer (le clic relâché ne doit rien ouvrir). */
export function wasRecentDrag(ms = 250) {
  return Date.now() - lastDragEndAt < ms;
}

/** Retour haptique court au décollement d'un élément (si supporté). */
export function hapticFeedback(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignoré — API absente (iOS Safari)
  }
}
