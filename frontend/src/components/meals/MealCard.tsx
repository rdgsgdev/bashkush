import { Clock, ChefHat } from 'lucide-react';
import type { Meal } from '../../types';
import { FavoriteButton } from './FavoriteButton';
import { cn } from '../../lib/utils';

interface MealCardProps {
  meal: Meal;
  onClick?: () => void;
  layout?: 'carousel' | 'list';
  showFavorite?: boolean;
  /** Carte sélectionnée (carrousel de planification) — annean direct sur la carte. */
  selected?: boolean;
}

const PLACEHOLDER_GRADIENTS = [
  'from-amber-200 to-orange-300',
  'from-emerald-200 to-teal-300',
  'from-sky-200 to-indigo-300',
  'from-rose-200 to-pink-300',
  'from-violet-200 to-purple-300',
];

function MealImage({ meal, className }: { meal: Meal; className?: string }) {
  if (meal.imageUrl) {
    return <img src={meal.imageUrl} alt={meal.name} className={cn('object-cover', className)} loading="lazy" />;
  }
  const grad = PLACEHOLDER_GRADIENTS[meal.name.length % PLACEHOLDER_GRADIENTS.length];
  return (
    <div className={cn('flex items-center justify-center bg-gradient-to-br text-4xl', grad, className)}>
      🍽️
    </div>
  );
}

export function MealCard({ meal, onClick, layout = 'list', showFavorite = true, selected }: MealCardProps) {
  if (layout === 'carousel') {
    return (
      <button
        data-meal-id={meal.id}
        onClick={onClick}
        className={cn(
          'group relative w-44 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-card transition',
          selected && 'ring-2 ring-inset ring-brand-500',
        )}
      >
        <div className="relative h-32 w-full">
          <MealImage meal={meal} className="h-full w-full" />
          {showFavorite && (
            <FavoriteButton
              mealId={meal.id}
              isFavorite={meal.isFavorite}
              size="sm"
              className="absolute right-1 top-1 bg-black/20 backdrop-blur-sm"
            />
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-stone-800">{meal.name}</p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-400">
            {meal.totalTime ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {meal.totalTime} min
              </span>
            ) : null}
            {meal.difficulty ? (
              <span className="inline-flex items-center gap-1">
                <ChefHat className="h-3 w-3" /> {meal.difficulty}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    );
  }

  // layout list
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card transition active:scale-[0.99]"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <MealImage meal={meal} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-stone-800">{meal.name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
          {meal.totalTime ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {meal.totalTime} min
            </span>
          ) : null}
          {meal.ingredients.length > 0 && <span>{meal.ingredients.length} ingrédients</span>}
        </div>
      </div>
      {showFavorite && <FavoriteButton mealId={meal.id} isFavorite={meal.isFavorite} />}
    </button>
  );
}
