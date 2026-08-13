import { useCallback, useEffect, useState } from 'react';

const storageKey = (planId: string) => `bashkush:steps:${planId}`;

/**
 * Mémorise les étapes de préparation cochées pour une planification donnée,
 * persistées en localStorage (pour reprendre la cuisson plus tard).
 * Les étapes cochées restent visibles (barrées).
 */
export function usePlanStepProgress(planId?: string) {
  const [done, setDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!planId) {
      setDone(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(planId));
      setDone(raw ? new Set<number>(JSON.parse(raw)) : new Set());
    } catch {
      setDone(new Set());
    }
  }, [planId]);

  const write = (next: Set<number>) => {
    if (planId) {
      try {
        localStorage.setItem(storageKey(planId), JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    }
  };

  const toggle = useCallback(
    (stepNumber: number) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(stepNumber)) next.delete(stepNumber);
        else next.add(stepNumber);
        write(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planId],
  );

  const reset = useCallback(() => {
    setDone(new Set());
    write(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  return { done, toggle, reset };
}
