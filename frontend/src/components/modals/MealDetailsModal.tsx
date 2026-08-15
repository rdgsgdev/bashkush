import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MealDetailsContent } from '../meals/MealDetailsContent';
import { usePlanStepProgress } from '../../hooks/usePlanStepProgress';
import { useUpdatePlanStatus } from '../../api/mealPlans';
import type { Meal, MealPlan, MealPlanStatus } from '../../types';

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
  const { done, toggle, reset } = usePlanStepProgress(plan?.id);
  const updateStatus = useUpdatePlanStatus();

  useEffect(() => {
    if (open) setServings(plan?.servings ?? resolvedMeal?.servings ?? 2);
  }, [open, plan, resolvedMeal]);

  if (!resolvedMeal) {
    return null;
  }

  const meal = resolvedMeal;
  const totalSteps = meal.steps?.length ?? 0;

  // ── Statut auto (contexte planification uniquement) ───────
  const deriveStatus = (count: number): MealPlanStatus =>
    totalSteps === 0 ? 'a_faire' : count === 0 ? 'a_faire' : count >= totalSteps ? 'prepare' : 'en_preparation';

  const handleToggle = (stepNumber: number) => {
    toggle(stepNumber);
    if (!plan || totalSteps === 0) return;
    const projected = new Set(done);
    if (projected.has(stepNumber)) projected.delete(stepNumber);
    else projected.add(stepNumber);
    updateStatus.mutate({ id: plan.id, status: deriveStatus(projected.size) });
  };

  const handleReset = () => {
    reset();
    if (plan) updateStatus.mutate({ id: plan.id, status: 'a_faire' });
  };

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
          isPlanContext ? { done, onToggle: handleToggle, onReset: handleReset } : undefined
        }
      />
    </Modal>
  );
}
