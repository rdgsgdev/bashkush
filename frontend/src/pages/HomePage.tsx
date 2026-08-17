import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingCart, ChefHat, Check, CalendarDays } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MealDetailsModal } from '../components/modals/MealDetailsModal';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { useGrocery, useToggleCheck } from '../api/grocery';
import { useMealPlans } from '../api/mealPlans';
import { todayValue, parseDate, formatShortDate, aisleColor, cn } from '../lib/utils';
import { AISLE_LABELS, STATUS_LABELS, MEAL_TYPE_LABELS } from '../types';
import type { MealPlan, MealPlanStatus } from '../types';

const STATUS_COLORS: Record<MealPlanStatus, string> = {
  a_faire: 'bg-amber-100 text-amber-700',
  en_preparation: 'bg-sky-100 text-sky-700',
  prepare: 'bg-emerald-100 text-emerald-700',
};

const MAX_PER_GROUP = 4;

/** Tri par date « du » la plus proche de la date courante (passée ou future). */
function byClosenessToToday(a: MealPlan, b: MealPlan): number {
  const today = parseDate(todayValue()).getTime();
  const dist = (p: MealPlan) => Math.abs(parseDate(p.fromDate.slice(0, 10)).getTime() - today);
  return dist(a) - dist(b);
}

function PlanRow({ plan, onOpen }: { plan: MealPlan; onOpen: (plan: MealPlan) => void }) {
  const meal = plan.meal;
  const totalSteps = meal.steps?.length ?? 0;
  const doneSteps = plan.completedSteps?.length ?? 0;

  return (
    <button
      onClick={() => onOpen(plan)}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card transition active:scale-[0.99]"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-800">{meal.name}</p>
        <p className="mt-0.5 text-xs text-stone-400">
          Du {formatShortDate(plan.fromDate)} au {formatShortDate(plan.toDate)} · {plan.servings}{' '}
          portion{plan.servings > 1 ? 's' : ''}
          {plan.mealType ? ` · ${MEAL_TYPE_LABELS[plan.mealType]}` : ''}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold',
              STATUS_COLORS[plan.status],
            )}
          >
            {STATUS_LABELS[plan.status]}
          </span>
          {totalSteps > 0 && (
            <span className="text-[11px] text-stone-400">
              {doneSteps}/{totalSteps} étape{totalSteps > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const grocery = useGrocery(false);
  const toggleCheck = useToggleCheck();
  const plansQuery = useMealPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { enPreparation, aFaire } = useMemo(() => {
    const plans = plansQuery.data ?? [];
    return {
      enPreparation: plans
        .filter((p) => p.status === 'en_preparation')
        .sort(byClosenessToToday)
        .slice(0, MAX_PER_GROUP),
      aFaire: plans
        .filter((p) => p.status === 'a_faire')
        .sort(byClosenessToToday)
        .slice(0, MAX_PER_GROUP),
    };
  }, [plansQuery.data]);

  const selectedPlan = plansQuery.data?.find((p) => p.id === selectedPlanId) ?? null;
  const pendingItems = (grocery.data?.items ?? []).filter((it) => !it.checked).slice(0, 6);

  const openPlan = (plan: MealPlan) => setSelectedPlanId(plan.id);

  const editPlanning = (planId: string) => {
    const plan = plansQuery.data?.find((p) => p.id === planId);
    setSelectedPlanId(null);
    navigate(`/calendar?date=${plan?.fromDate.slice(0, 10) ?? todayValue()}&plan=${planId}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header logo="/logo-inline.png" />

      <main className="flex-1 space-y-6 p-4">
        {/* Plats planifiés — à préparer (en cours d'abord, puis à faire) */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <ChefHat className="h-4 w-4 text-brand-500" /> À préparer
            </h2>
            <button
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600"
            >
              Calendrier <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {plansQuery.isLoading ? (
            <FullScreenLoader />
          ) : plansQuery.isError && !plansQuery.data ? (
            <ErrorState />
          ) : enPreparation.length === 0 && aFaire.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <EmptyState
                icon={CalendarDays}
                title="Aucun plat à préparer"
                description="Planifiez un plat pour le voir apparaître ici."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {enPreparation.map((plan) => (
                <PlanRow key={plan.id} plan={plan} onOpen={openPlan} />
              ))}
              {aFaire.map((plan) => (
                <PlanRow key={plan.id} plan={plan} onOpen={openPlan} />
              ))}
            </div>
          )}
        </section>

        {/* Aperçu liste de courses — seule la case à cocher marque l'item acheté */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <ShoppingCart className="h-4 w-4 text-brand-500" /> À acheter
            </h2>
            <button
              onClick={() => navigate('/grocery')}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600"
            >
              Liste complète <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-2xl bg-white p-2 shadow-card">
            {grocery.isLoading ? null : grocery.isError && !grocery.data ? (
              <ErrorState />
            ) : pendingItems.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Rien à acheter"
                description="Votre liste de courses est à jour."
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {pendingItems.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 px-2 py-2.5">
                    <button
                      onClick={() => toggleCheck.mutate(it.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-stone-300 text-transparent transition hover:border-brand-400 active:scale-95"
                      aria-label={`Marquer ${it.name} comme acheté`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">
                      {it.name}
                    </span>
                    <span className="shrink-0 text-xs text-stone-400">
                      {it.quantity} {it.unit}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${aisleColor(it.aisle)}`}
                    >
                      {AISLE_LABELS[it.aisle] ?? it.aisle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-1.5 px-1 text-xs text-stone-400">
            Cochez la case pour marquer un élément comme acheté.
          </p>
        </section>
      </main>

      <MealDetailsModal
        plan={selectedPlan}
        open={Boolean(selectedPlanId)}
        onClose={() => setSelectedPlanId(null)}
        onEditPlanning={editPlanning}
      />
    </div>
  );
}
