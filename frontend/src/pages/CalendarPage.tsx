import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays, Clock } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Calendar } from '../components/calendar/Calendar';
import { MealPlanningModal } from '../components/modals/MealPlanningModal';
import { MealDetailsModal } from '../components/modals/MealDetailsModal';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { useMealPlansForDate, useMealPlansForRange } from '../api/mealPlans';
import { buildPlannedDays } from '../lib/plans';
import { todayValue, formatShortDate, cn } from '../lib/utils';
import { STATUS_LABELS } from '../types';
import type { MealPlanStatus } from '../types';

const STATUS_COLORS: Record<MealPlanStatus, string> = {
  a_faire: 'bg-amber-100 text-amber-700',
  en_preparation: 'bg-sky-100 text-sky-700',
  prepare: 'bg-emerald-100 text-emerald-700',
};

export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const activeDate = params.get('date') ?? todayValue();

  const setDate = (d: string) => {
    params.set('date', d);
    setParams(params, { replace: true });
  };

  // Plans du jour actif + plans du mois affiché (pour les pastilles).
  const dayPlans = useMealPlansForDate(activeDate);
  const initMonth = new Date();
  const [viewRange, setViewRange] = useState({
    from: `${initMonth.getFullYear()}-${String(initMonth.getMonth() + 1).padStart(2, '0')}-01`,
    to: `${initMonth.getFullYear()}-${String(initMonth.getMonth() + 1).padStart(2, '0')}-28`,
  });
  const monthPlans = useMealPlansForRange(viewRange.from, viewRange.to);
  const plannedDays = buildPlannedDays(monthPlans.data ?? []);

  const planParam = params.get('plan');
  const isCreating = planParam === 'new';
  const editingPlan = dayPlans.data?.find((p) => p.id === planParam) ?? null;
  const modalOpen = Boolean(planParam);

  const recipeParam = params.get('recipe');
  const detailsPlan = dayPlans.data?.find((p) => p.id === recipeParam) ?? null;
  const detailsOpen = Boolean(recipeParam);

  const closeModal = () => {
    params.delete('plan');
    setParams(params, { replace: true });
  };
  const closeDetails = () => {
    params.delete('recipe');
    setParams(params, { replace: true });
  };
  const editPlanning = (planId: string) => {
    params.delete('recipe');
    params.set('plan', planId);
    setParams(params, { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title="Calendrier"
        subtitle="Planification des repas"
        action={
          <Button onClick={() => setParams({ date: activeDate, plan: 'new' })} className="!px-3 !py-2">
            <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Planifier</span>
          </Button>
        }
      />

      <main className="flex-1 space-y-5 p-4">
        <Calendar
          activeDate={activeDate}
          onSelectDate={setDate}
          onViewMonthChange={(r) => setViewRange({ from: r.from, to: r.to })}
          plannedDays={plannedDays}
        />

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold capitalize text-stone-700">
            <Clock className="h-4 w-4 text-brand-500" />
            {formatShortDate(activeDate)}
          </h2>

          {dayPlans.isLoading ? (
            <FullScreenLoader />
          ) : dayPlans.isError && !dayPlans.data ? (
            <ErrorState />
          ) : (dayPlans.data?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <EmptyState
                icon={CalendarDays}
                title="Aucun plat planifié ce jour"
                description="Planifiez un plat pour qu'il apparaisse ici."
                action={
                  <Button onClick={() => setParams({ date: activeDate, plan: 'new' })}>
                    <Plus className="h-4 w-4" /> Planifier un plat
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {dayPlans.data!.map((plan) => {
                const meal = plan.meal;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setParams({ date: activeDate, recipe: plan.id })}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card transition active:scale-[0.99]"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      {meal.imageUrl ? (
                        <img src={meal.imageUrl} alt={meal.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-stone-800">{meal.name}</p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        Du {formatShortDate(plan.fromDate)} au {formatShortDate(plan.toDate)} ·{' '}
                        {plan.servings} portion{plan.servings > 1 ? 's' : ''}
                      </p>
                      <span
                        className={cn(
                          'mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          STATUS_COLORS[plan.status],
                        )}
                      >
                        {STATUS_LABELS[plan.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <MealPlanningModal
        plan={isCreating ? null : editingPlan}
        open={modalOpen}
        onClose={closeModal}
        defaultDate={activeDate}
      />
      <MealDetailsModal
        plan={detailsPlan}
        open={detailsOpen}
        onClose={closeDetails}
        onEditPlanning={editPlanning}
      />
    </div>
  );
}
