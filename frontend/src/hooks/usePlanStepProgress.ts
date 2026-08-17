import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpdatePlanSteps } from '../api/mealPlans';
import type { MealPlan } from '../types';

/**
 * Étapes de préparation cochées d'une planification.
 * Source de vérité : `plan.completedSteps` côté serveur — partagé entre
 * tous les membres de la famille (chacun voit les coches des autres,
 * rafraîchies en direct). Les bascules partent en mutation optimiste ;
 * le serveur redérive le statut du plan depuis la liste envoyée.
 */
export function usePlanStepProgress(plan?: MealPlan | null) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const updateSteps = useUpdatePlanSteps();
  // Pendant une mutation en cours, l'état local (optimiste) prime sur
  // les mises à jour du cache pour éviter tout clignotement.
  const pendingRef = useRef(false);

  const planId = plan?.id;
  const completedSteps = plan?.completedSteps;

  useEffect(() => {
    if (pendingRef.current) return;
    setDone(new Set(completedSteps ?? []));
  }, [completedSteps, planId]);

  const persist = (id: string, next: Set<number>) => {
    pendingRef.current = true;
    updateSteps.mutate(
      { id, completedSteps: [...next] },
      { onSettled: () => (pendingRef.current = false) },
    );
  };

  const toggle = useCallback(
    (stepNumber: number) => {
      if (!planId) return;
      const next = new Set(done);
      if (next.has(stepNumber)) next.delete(stepNumber);
      else next.add(stepNumber);
      setDone(next);
      persist(planId, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [done, planId],
  );

  const reset = useCallback(() => {
    if (!planId) return;
    setDone(new Set());
    persist(planId, new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  return { done, toggle, reset, pending: updateSteps.isPending };
}
