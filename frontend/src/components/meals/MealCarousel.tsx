import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Meal } from '../../types';
import { MealCard } from './MealCard';
import { useMeals } from '../../api/meals';
import { FullScreenLoader } from '../ui/Feedback';

interface MealCarouselProps {
  /** Repas sélectionné (pour le surlignage). */
  selectedId?: string;
  onSelect?: (meal: Meal) => void;
  /** Affiche une tuile « Ajouter un plat » en première position (ex: accueil). */
  onAdd?: () => void;
  /** Plat vers lequel défiler automatiquement (ex: planification ouverte depuis
   *  la fiche d'un plat). Dérivé des props du parent — donc correct dès le
   *  premier rendu, contrairement au state synchronisé par effet. */
  scrollToId?: string;
}

/** Carrousel horizontal scroll-snap des plats (favoris en tête). */
export function MealCarousel({ selectedId, onSelect, onAdd, scrollToId }: MealCarouselProps) {
  const { data: meals, isLoading } = useMeals();
  const ref = useRef<HTMLDivElement>(null);

  // Défile jusqu'au plat demandé dès qu'il est rendu (les plats peuvent
  // arriver après le montage si la requête est en cours). Une seule fois par
  // valeur : la sélection manuelle d'un autre plat n'est jamais perturbée.
  // Le ref se réinitialise à chaque réouverture (la modale démonte son contenu).
  const lastScrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollToId || lastScrolledTo.current === scrollToId || !meals?.length) return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-meal-id="${scrollToId}"]`);
    if (!el) return;
    lastScrolledTo.current = scrollToId;
    el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
  }, [scrollToId, meals]);

  const scrollBy = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="relative">
      <div
        ref={ref}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2"
      >
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex w-44 shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 text-brand-600 shadow-card transition active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Ajouter un plat</span>
          </button>
        )}
        {(meals ?? []).map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            layout="carousel"
            selected={selectedId === meal.id}
            onClick={() => onSelect?.(meal)}
          />
        ))}
      </div>

      {(meals?.length ?? 0) > 2 && (
        <>
          <button
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-soft sm:block"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-soft sm:block"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
