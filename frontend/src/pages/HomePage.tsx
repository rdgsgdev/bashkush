import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, ShoppingCart, ChefHat, Check, CalendarDays, UtensilsCrossed, ScanLine } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PullToRefresh } from '../components/common/PullToRefresh';
import { MealCarousel } from '../components/meals/MealCarousel';
import { StoreLogo } from '../components/grocery/StoreLogo';
import { MealDetailsModal } from '../components/modals/MealDetailsModal';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { useGrocery, useToggleCheck } from '../api/grocery';
import { useMealPlans } from '../api/mealPlans';
import { useUiStore } from '../store/uiStore';
import { todayValue, parseDate, formatShortDate, aisleColor, cn } from '../lib/utils';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { AISLE_LABELS, STATUS_LABELS } from '../types';
import { useOptionLabel } from '../hooks/useOptionList';
import type { MealPlan, MealPlanStatus } from '../types';

const STATUS_COLORS: Record<MealPlanStatus, string> = {
  a_faire: 'bg-amber-100 text-amber-700',
  en_preparation: 'bg-sky-100 text-sky-700',
  prepare: 'bg-emerald-100 text-emerald-700',
};

const MAX_PER_GROUP = 4;
/** Aperçu « À acheter » : nombre d'items non cochés affichés avant de
    devoir charger la liste complète (fondu + bouton « Tout afficher »). */
const MAX_GROCERY_PREVIEW = 6;

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
  // Types de repas paramétrables de la famille (Paramètres).
  const mealTypeLabel = useOptionLabel('meal_type');

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
          {plan.mealType ? ` · ${mealTypeLabel(plan.mealType)}` : ''}
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
  const isDesktop = useIsDesktop();
  const grocery = useGrocery(false);
  const toggleCheck = useToggleCheck();
  // Mémoire de session : une fois la liste complète chargée, elle le reste
  // (même en arrière-plan ou en naviguant ailleurs) jusqu'à la fermeture de l'app.
  const groceryPreviewExpanded = useUiStore((s) => s.groceryPreviewExpanded);
  const expandGroceryPreview = useUiStore((s) => s.expandGroceryPreview);
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
  const allPendingItems = (grocery.data?.items ?? []).filter((it) => !it.checked);
  const isTruncated = !groceryPreviewExpanded && allPendingItems.length > MAX_GROCERY_PREVIEW;
  const pendingItems = isTruncated ? allPendingItems.slice(0, MAX_GROCERY_PREVIEW) : allPendingItems;
  const hiddenCount = allPendingItems.length - MAX_GROCERY_PREVIEW;

  const openPlan = (plan: MealPlan) => {
    // Desktop : le clic mène à la page calendrier (centre) avec les détails
    // du plan affichés dans le side panel, via le mécanisme `recipe` de la
    // page calendrier. Mobile : modale Details ouverte sur la homepage.
    if (isDesktop) {
      navigate(`/calendar?date=${plan.fromDate.slice(0, 10)}&recipe=${plan.id}`);
      return;
    }
    setSelectedPlanId(plan.id);
  };

  const editPlanning = (planId: string) => {
    const plan = plansQuery.data?.find((p) => p.id === planId);
    setSelectedPlanId(null);
    navigate(`/calendar?date=${plan?.fromDate.slice(0, 10) ?? todayValue()}&plan=${planId}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Desktop : titre « Accueil » ; mobile : logo inline. */}
      <Header
        title={isDesktop ? 'Accueil' : undefined}
        logo={isDesktop ? undefined : '/logo_text_green.svg'}
      />

      <PullToRefresh queryKeys={[['mealPlans'], ['grocery'], ['meals']]}>
        {/* Tablettes / téléphone paysage (768–1023px) : deux colonnes —
            préparations à gauche, carrousel à droite, courses sur toute la
            largeur. Desktop (≥ 1024px) : colonnes empilées centrées. */}
        <main className="flex-1 space-y-6 p-4 md:mx-auto md:w-full md:max-w-3xl md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:items-start md:max-lg:gap-6 md:max-lg:space-y-0">
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

          {/* Tous mes plats — carrousel avec raccourci de création en tête */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
                <UtensilsCrossed className="h-4 w-4 text-brand-500" /> Mes plats
              </h2>
              <button
                onClick={() => navigate('/meals')}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600"
              >
                Tous les plats <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <MealCarousel
              onAdd={() => navigate('/meals?meal=new')}
              onSelect={(m) => navigate(`/meals?details=${m.id}`)}
            />
          </section>

          {/* Aperçu liste de courses — seule la case à cocher marque l'item acheté */}
          <section className="md:max-lg:col-span-2">
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
                <div className="relative">
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
                        <StoreLogo store={it.store} />
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${aisleColor(it.aisle)}`}
                        >
                          {AISLE_LABELS[it.aisle] ?? it.aisle}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {/* Liste incomplète : fondu blanc + flou sur les derniers
                      éléments visibles. L'overlay capte les clics : les
                      éléments floutés ne sont pas cochables, seul le bouton
                      permet de charger la liste complète. */}
                  {isTruncated && (
                    <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-white via-white/70 to-transparent pb-2 backdrop-blur-[2px]">
                      <button
                        type="button"
                        onClick={expandGroceryPreview}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-soft transition active:scale-95"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Tout afficher (+{hiddenCount})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1.5 px-1 text-xs text-stone-400">
              Cochez la case pour marquer un élément comme acheté.
            </p>
          </section>

          {/* Raccourci analyse de produits — scan code-barres (score, qualités, défauts) */}
          <section className="md:max-lg:col-span-2">
            <button
              onClick={() => navigate('/analyses')}
              className="flex w-full items-center gap-4 rounded-2xl bg-brand-500 p-4 text-left text-white shadow-card transition active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <ScanLine className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Analyser un produit</span>
                <span className="block text-xs text-white/80">
                  Scanne un code-barres pour découvrir son score et ses qualités et défauts.
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-white/70" />
            </button>
          </section>
        </main>
      </PullToRefresh>

      <MealDetailsModal
        plan={selectedPlan}
        open={Boolean(selectedPlanId)}
        onClose={() => setSelectedPlanId(null)}
        onEditPlanning={editPlanning}
      />
    </div>
  );
}
