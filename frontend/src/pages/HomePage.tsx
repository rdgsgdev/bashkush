import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingCart, CalendarDays, UtensilsCrossed, Check } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MealCarousel } from '../components/meals/MealCarousel';
import { Calendar } from '../components/calendar/Calendar';
import { EmptyState, ErrorState } from '../components/ui/Feedback';
import { useGrocery, useToggleCheck } from '../api/grocery';
import { useMealPlansForRange } from '../api/mealPlans';
import { buildPlannedDays } from '../lib/plans';
import { todayValue, aisleColor } from '../lib/utils';
import { AISLE_LABELS } from '../types';
import { useState } from 'react';

export function HomePage() {
  const navigate = useNavigate();
  const [activeDate] = useState(todayValue());
  const grocery = useGrocery(false);
  const toggleCheck = useToggleCheck();

  // Plage du mois actuellement affiché (pour les pastilles). Évolue avec la
  // navigation mois/mois du calendrier — sans déclencher de redirection.
  const initialMonth = new Date();
  const [viewRange, setViewRange] = useState({
    from: `${initialMonth.getFullYear()}-${String(initialMonth.getMonth() + 1).padStart(2, '0')}-01`,
    to: `${initialMonth.getFullYear()}-${String(initialMonth.getMonth() + 1).padStart(2, '0')}-28`,
  });
  const plansQuery = useMealPlansForRange(viewRange.from, viewRange.to);
  const plannedDays = buildPlannedDays(plansQuery.data ?? []);

  const pendingItems = (grocery.data?.items ?? []).filter((it) => !it.checked).slice(0, 6);

  return (
    <div className="flex flex-1 flex-col">
      <Header logo="/logo-inline.png" />

      <main className="flex-1 space-y-6 p-4">
        {/* Carrousel des plats */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <UtensilsCrossed className="h-4 w-4 text-brand-500" /> Plats récents
            </h2>
            <button
              onClick={() => navigate('/meals')}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600"
            >
              Tout voir <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <MealCarousel onSelect={(meal) => navigate(`/meals?details=${meal.id}`)} />
        </section>

        {/* Calendrier */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-stone-700">
            <CalendarDays className="h-4 w-4 text-brand-500" /> Calendrier
          </h2>
          <Calendar
            activeDate={activeDate}
            onSelectDate={(d) => navigate(`/calendar?date=${d}`)}
            onViewMonthChange={(r) => setViewRange({ from: r.from, to: r.to })}
            plannedDays={plannedDays}
            compact
          />
        </section>

        {/* Aperçu liste de courses */}
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
                  <li key={it.id}>
                    <button
                      onClick={() => toggleCheck.mutate(it.id)}
                      className="flex w-full items-center gap-3 px-2 py-2.5 text-left transition hover:bg-stone-50 active:bg-stone-100"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-stone-300 text-transparent">
                        <Check className="h-3.5 w-3.5" />
                      </span>
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
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-1.5 px-1 text-xs text-stone-400">
            Touchez un élément pour le marquer comme acheté.
          </p>
        </section>
      </main>
    </div>
  );
}
