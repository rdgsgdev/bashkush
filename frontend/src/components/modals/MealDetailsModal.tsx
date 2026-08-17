import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MealDetailsContent } from '../meals/MealDetailsContent';
import { usePlanStepProgress } from '../../hooks/usePlanStepProgress';
import type { Meal, MealPlan } from '../../types';

interface MealDetailsModalProps {
  open: boolean;
  onClose: () => void;
  /** Contexte planification (calendrier) : étapes cochables + modif de la planification. */
  plan?: MealPlan | null;
  onEditPlanning?: (planId: string) => void;
  /** Contexte simple (liste des plats) : lecture seule + modif du plat. */
  meal?: Meal | null;
  onEditMeal?: (mealId: string) => void;
}

export function MealDetailsModal({
  open,
  onClose,
  plan,
  onEditPlanning,
  meal: mealProp,
  onEditMeal,
}: MealDetailsModalProps) {
  const resolvedMeal = plan?.meal ?? mealProp ?? null;
  const isPlanContext = Boolean(plan);

  const [servings, setServings] = useState<number>(plan?.servings ?? resolvedMeal?.servings ?? 2);
  // Étapes cochées : persistées côté serveur (partagées avec la famille),
  // le statut du plan est redérivé par l'API à chaque mise à jour.
  const { done, toggle, reset } = usePlanStepProgress(plan);

  useEffect(() => {
    if (open) setServings(plan?.servings ?? resolvedMeal?.servings ?? 2);
  }, [open, plan, resolvedMeal]);

  if (!resolvedMeal) {
    return null;
  }

  const meal = resolvedMeal;

  const footer = isPlanContext && plan ? (
    <Button variant="secondary" className="w-full" onClick={() => onEditPlanning?.(plan.id)}>
      <Pencil className="h-4 w-4" /> Modifier la planification
    </Button>
  ) : (
    <Button variant="secondary" className="w-full" onClick={() => onEditMeal?.(meal.id)}>
      <Pencil className="h-4 w-4" /> Modifier le plat
    </Button>
  );

  return (
    <Modal open={open} onClose={onClose} title={meal.name} footer={footer}>
      <MealDetailsContent
        meal={meal}
        servings={servings}
        onServingsChange={setServings}
        stepsInteraction={
          isPlanContext ? { done, onToggle: toggle, onReset: reset } : undefined
        }
      />
    </Modal>
  );
}
