// ── Corps de détail d'un plat (lecture) ──────────────────────
// Composant partagé entre MealDetailsModal (détails/planification)
// et MealAIGenerationModal (aperçu d'un plat généré par IA).

import { Clock, ChefHat, Flame, Check, RotateCcw, Users } from 'lucide-react';
import { NumberStepper } from '../ui/NumberStepper';
import { DIFFICULTY_LABELS, AISLE_LABELS } from '../../types';
import type { Difficulty, Ingredient, Nutrition, Step } from '../../types';
import { useOptionLabel } from '../../hooks/useOptionList';
import { cn, formatQty, aisleColor } from '../../lib/utils';

/** Données nécessaires à l'affichage (satisfaites par Meal comme par MealDraft). */
export interface MealContentData {
  name: string;
  description?: string | null;
  servings?: number;
  prepTime?: number | null;
  cookTime?: number | null;
  difficulty?: Difficulty | null;
  category?: string | null;
  nutrition?: Nutrition | null;
  notes?: string | null;
  imageUrl?: string | null;
  ingredients: Ingredient[];
  steps?: Step[] | null;
}

/** Étapes cochables (contexte planification uniquement). */
export interface StepInteraction {
  done: ReadonlySet<number>;
  onToggle: (stepNumber: number) => void;
  onReset: () => void;
}

interface MealDetailsContentProps {
  meal: MealContentData;
  servings: number;
  onServingsChange: (servings: number) => void;
  maxServings?: number;
  stepsInteraction?: StepInteraction;
}

export function MealDetailsContent({
  meal,
  servings,
  onServingsChange,
  maxServings = 10,
  stepsInteraction,
}: MealDetailsContentProps) {
  // Catégories paramétrables de la famille — repli sur le libellé historique
  // puis sur la valeur brute (catégorie retirée de la liste / personnalisée).
  const categoryLabel = useOptionLabel('category');
  const baseServings = meal.servings || 1;
  const ratio = servings / baseServings;
  const scaledQty = (q: number) => Math.round(q * ratio * 1000) / 1000;
  const steps = meal.steps ?? [];
  const ingredients = meal.ingredients ?? [];
  const totalSteps = steps.length;
  const doneCount = stepsInteraction?.done.size ?? 0;
  const isInteractive = Boolean(stepsInteraction);

  return (
    <div className="space-y-5">
      {/* Photo */}
      {meal.imageUrl && (
        <img src={meal.imageUrl} alt={meal.name} className="h-44 w-full rounded-2xl object-cover" />
      )}

      {/* Méta */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {meal.prepTime != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
            <Clock className="h-3.5 w-3.5" /> Prép. {meal.prepTime} min
          </span>
        )}
        {meal.cookTime != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
            <Flame className="h-3.5 w-3.5" /> Cuisson {meal.cookTime} min
          </span>
        )}
        {meal.difficulty && (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
            <ChefHat className="h-3.5 w-3.5" /> {DIFFICULTY_LABELS[meal.difficulty]}
          </span>
        )}
        {meal.category && (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
            {categoryLabel(meal.category)}
          </span>
        )}
      </div>

      {meal.description && (
        <p className="text-sm leading-relaxed text-stone-600">{meal.description}</p>
      )}

      {/* Portions (ajustables dans tous les contextes) */}
      <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <Users className="h-4 w-4" /> Portions
        </span>
        <NumberStepper value={servings} min={1} max={maxServings} onChange={onServingsChange} />
      </div>

      {/* Ingrédients (mis à l'échelle) */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-stone-700">
          Ingrédients <span className="font-normal text-stone-400">· pour {servings} portion{servings > 1 ? 's' : ''}</span>
        </h3>
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-card">
          {ingredients.map((ing) => (
            <li key={ing.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium text-stone-800">
                  {ing.name}
                  {ing.optional && <span className="ml-1 text-xs text-stone-400">(optionnel)</span>}
                </span>
                {ing.notes && <span className="block truncate text-xs text-stone-400">{ing.notes}</span>}
              </span>
              <span className="shrink-0 text-sm font-semibold text-stone-700">
                {formatQty(scaledQty(ing.quantity))} {ing.unit}
              </span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', aisleColor(ing.aisle))}>
                {AISLE_LABELS[ing.aisle] ?? ing.aisle}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Étapes : cochables en contexte planification, lecture seule sinon */}
      {totalSteps > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-700">
              Préparation{' '}
              {isInteractive && (
                <span className="font-normal text-stone-400">
                  ({doneCount}/{totalSteps})
                </span>
              )}
            </h3>
            {isInteractive && doneCount > 0 && (
              <button onClick={stepsInteraction!.onReset} className="btn-ghost text-xs text-stone-500">
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
              </button>
            )}
          </div>

          <ol className="space-y-2">
            {steps.map((step) => {
              const isDone = isInteractive && stepsInteraction!.done.has(step.stepNumber);
              const badge = isInteractive ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition',
                    isDone ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 text-transparent',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {step.stepNumber}
                </span>
              );
              const label = (
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-brand-600">
                    Étape {step.stepNumber}
                    {step.time ? <span className="font-normal text-stone-400"> · {step.time} min</span> : null}
                  </span>
                  <span
                    className={cn(
                      'block text-sm leading-relaxed text-stone-700',
                      isDone && 'text-stone-400 line-through',
                    )}
                  >
                    {step.instruction}
                  </span>
                </span>
              );
              return (
                <li key={step.stepNumber}>
                  {isInteractive ? (
                    // Bouton pleine largeur : Safari (iOS) ne génère pas
                    // d'évènement click fiable sur les éléments non
                    // interactifs comme <li> — un vrai <button> marche partout.
                    <button
                      type="button"
                      aria-pressed={isDone}
                      onClick={() => stepsInteraction!.onToggle(step.stepNumber)}
                      className={cn(
                        'flex w-full cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-brand-300',
                        isDone ? 'border-brand-200 bg-brand-50/50' : 'border-stone-200',
                      )}
                    >
                      {badge}
                      {label}
                    </button>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3">
                      {badge}
                      {label}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Nutrition */}
      {meal.nutrition && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-stone-700">
            Apports <span className="font-normal text-stone-400">par portion</span>
          </h3>
          <div className="grid grid-cols-5 gap-2 text-center">
            {(
              [
                ['kcal', meal.nutrition.calories],
                ['Prot.', meal.nutrition.protein],
                ['Gluc.', meal.nutrition.carbs],
                ['Lip.', meal.nutrition.fat],
                ['Fibres', meal.nutrition.fiber],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="rounded-xl bg-white py-2 shadow-card">
                <p className="text-sm font-bold text-stone-800">{val ?? '—'}</p>
                <p className="text-[10px] uppercase text-stone-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {meal.notes && (
        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <span className="font-semibold">Note : </span>
          {meal.notes}
        </div>
      )}
    </div>
  );
}
