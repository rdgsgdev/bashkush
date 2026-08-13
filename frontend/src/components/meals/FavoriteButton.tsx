import { Heart } from 'lucide-react';
import { useToggleFavorite } from '../../api/meals';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface FavoriteButtonProps {
  mealId: string;
  isFavorite: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({ mealId, isFavorite, className, size = 'md' }: FavoriteButtonProps) {
  const toggle = useToggleFavorite();
  const [optimistic, setOptimistic] = useState(isFavorite);

  // Synchronise l'état optimiste quand la prop change.
  if (isFavorite !== optimistic && !toggle.isPending) {
    setOptimistic(isFavorite);
  }

  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setOptimistic(!optimistic);
        toggle.mutate(mealId);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1.5 transition hover:bg-white/70',
        className,
      )}
      aria-label={optimistic ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart
        className={cn(
          sizes[size],
          optimistic ? 'fill-rose-500 text-rose-500' : 'fill-none text-stone-400',
        )}
      />
    </button>
  );
}
