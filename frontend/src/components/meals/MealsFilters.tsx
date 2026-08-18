import { ReactNode } from 'react';
import { ArrowUpDown, ChevronDown, Heart, RotateCcw, Search, X } from 'lucide-react';
import { Difficulty } from '../../types';
import { DIFFICULTY_OPTIONS } from '../../lib/options';
import { useOptionList } from '../../hooks/useOptionList';
import { cn } from '../../lib/utils';

/** Critères de tri de la liste des plats. */
export type MealSort = 'recent' | 'name' | 'time';

const SORT_OPTIONS: { value: MealSort; label: string }[] = [
  { value: 'recent', label: 'Récents' },
  { value: 'name', label: 'Nom (A–Z)' },
  { value: 'time', label: 'Le plus rapide' },
];

interface MealsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string | 'all';
  onCategoryChange: (value: string | 'all') => void;
  difficulty: Difficulty | 'all';
  onDifficultyChange: (value: Difficulty | 'all') => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  sort: MealSort;
  onSortChange: (value: MealSort) => void;
  /** Au moins un filtre actif (hors tri) → affiche la puce "Réinitialiser". */
  hasActiveFilters: boolean;
  onReset: () => void;
}

/** Puce de filtre défilable (favoris, difficulté, catégorie). */
function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
      )}
    >
      {children}
    </button>
  );
}

/** Barre de recherche + tri + puces de filtres de la liste des plats (voir MealsPage). */
export function MealsFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  difficulty,
  onDifficultyChange,
  favoritesOnly,
  onToggleFavoritesOnly,
  sort,
  onSortChange,
  hasActiveFilters,
  onReset,
}: MealsFiltersProps) {
  // Catégories paramétrables de la famille (Paramètres).
  const { options: categoryOptions } = useOptionList('category');
  return (
    <div className="space-y-2.5 border-b border-stone-200 bg-white px-4 py-3">
      {/* Recherche + tri */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un plat…"
            className="field !pl-9 !pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative shrink-0">
          <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as MealSort)}
            aria-label="Trier les plats"
            className="field !w-auto cursor-pointer appearance-none !py-2.5 !pl-8 !pr-6"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
        </div>
      </div>

      {/* Puces défilantes : favoris, difficulté, catégories */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 scrollbar-none">
        {hasActiveFilters && (
          <Chip onClick={onReset}>
            <RotateCcw className="mr-1 inline h-3 w-3" /> Réinitialiser
          </Chip>
        )}
        <Chip active={favoritesOnly} onClick={onToggleFavoritesOnly}>
          <Heart className={cn('mr-1 inline h-3 w-3', favoritesOnly && 'fill-current')} /> Favoris
        </Chip>
        {DIFFICULTY_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={difficulty === o.value}
            onClick={() => onDifficultyChange(difficulty === o.value ? 'all' : (o.value as Difficulty))}
          >
            {o.label}
          </Chip>
        ))}
        <span className="my-auto h-4 w-px shrink-0 bg-stone-200" aria-hidden />
        <Chip active={category === 'all'} onClick={() => onCategoryChange('all')}>
          Toutes
        </Chip>
        {categoryOptions.map((o) => (
          <Chip
            key={o.value}
            active={category === o.value}
            onClick={() => onCategoryChange(category === o.value ? 'all' : o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
