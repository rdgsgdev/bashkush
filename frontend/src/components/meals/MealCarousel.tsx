import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Meal } from '../../types';
import { MealCard } from './MealCard';
import { useMeals } from '../../api/meals';
import { FullScreenLoader } from '../ui/Feedback';

interface MealCarouselProps {
  /** Repas sélectionné (pour le surlignage). */
  selectedId?: string;
  onSelect?: (meal: Meal) => void;
}

/** Carrousel horizontal scroll-snap des plats (favoris en tête). */
export function MealCarousel({ selectedId, onSelect }: MealCarouselProps) {
  const { data: meals, isLoading } = useMeals();
  const ref = useRef<HTMLDivElement>(null);

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
