import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, SearchX, UtensilsCrossed } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MealCard } from '../components/meals/MealCard';
import { MealsFilters, MealSort } from '../components/meals/MealsFilters';
import { MealEditionModal } from '../components/modals/MealEditionModal';
import { MealDetailsModal } from '../components/modals/MealDetailsModal';
import { MealPlanningModal } from '../components/modals/MealPlanningModal';
import { MealModeChoiceModal } from '../components/modals/MealModeChoiceModal';
import { MealAIGenerationModal } from '../components/modals/MealAIGenerationModal';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { useMeals } from '../api/meals';
import { Difficulty } from '../types';

/** Minuscules sans accents, pour une recherche insensible aux diacritiques. */
function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function MealsPage() {
  const [params, setParams] = useSearchParams();
  const { data: meals, isLoading, isError } = useMeals();

  // Filtres/tri de la liste (état local, remis à zéro en quittant la page).
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<MealSort>('recent');

  const hasActiveFilters =
    search.trim() !== '' || category !== 'all' || difficulty !== 'all' || favoritesOnly;

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setDifficulty('all');
    setFavoritesOnly(false);
  };

  const visibleMeals = useMemo(() => {
    if (!meals) return [];
    const query = normalizeText(search.trim());
    const filtered = meals.filter((meal) => {
      if (favoritesOnly && !meal.isFavorite) return false;
      if (category !== 'all' && meal.category !== category) return false;
      if (difficulty !== 'all' && meal.difficulty !== difficulty) return false;
      if (query && !normalizeText(meal.name).includes(query)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
        case 'time':
          // Plats sans temps total envoyés en fin de liste.
          return (a.totalTime ?? Infinity) - (b.totalTime ?? Infinity);
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [meals, search, category, difficulty, favoritesOnly, sort]);

  // Modale d'ajout : ?meal=new → choix (IA ou manuel).
  const mealParam = params.get('meal');
  const isChoosing = mealParam === 'new';
  const isCreatingManually = mealParam === 'manual';
  const isGeneratingWithAI = mealParam === 'ai';
  // Modale de modification IA : ?mealai=<id>.
  const aiEditParam = params.get('mealai');
  const editingAiMeal = meals?.find((m) => m.id === aiEditParam) ?? null;
  const isEditingWithAI = Boolean(editingAiMeal);
  // Modale de choix d'édition : ?editchoice=<id>.
  const editChoiceParam = params.get('editchoice');
  const isChoosingEdit = Boolean(editChoiceParam);
  const editingMeal =
    !isChoosing && !isCreatingManually && !isGeneratingWithAI
      ? (meals?.find((m) => m.id === mealParam) ?? null)
      : null;
  const closeModal = () => {
    params.delete('meal');
    params.delete('editchoice');
    params.delete('mealai');
    setParams(params, { replace: true });
  };
  const chooseAddMode = (mode: 'ai' | 'manual') => {
    params.set('meal', mode);
    setParams(params, { replace: true });
  };
  const chooseEditMode = (mode: 'ai' | 'manual') => {
    if (!editChoiceParam) return;
    params.delete('editchoice');
    params.set(mode === 'ai' ? 'mealai' : 'meal', editChoiceParam);
    setParams(params, { replace: true });
  };

  // Modale détails (lecture seule + portions éditables).
  const detailsParam = params.get('details');
  const detailsMeal = meals?.find((m) => m.id === detailsParam) ?? null;
  const detailsOpen = Boolean(detailsParam);
  const closeDetails = () => {
    params.delete('details');
    setParams(params, { replace: true });
  };
  const editMeal = (mealId: string) => {
    params.delete('details');
    params.set('editchoice', mealId);
    setParams(params, { replace: true });
  };

  // Modale de planification : ?plan=<mealId> → création avec plat présélectionné.
  const planParam = params.get('plan');
  const planningOpen = Boolean(planParam);
  const closePlanning = () => {
    params.delete('plan');
    setParams(params, { replace: true });
  };
  const planMeal = (mealId: string) => {
    params.delete('details');
    params.set('plan', mealId);
    setParams(params, { replace: true });
  };

  const total = meals?.length ?? 0;
  const subtitle = hasActiveFilters
    ? `${visibleMeals.length} sur ${total} plats`
    : `${total} plat${total > 1 ? 's' : ''}`;

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title="Mes plats"
        subtitle={subtitle}
        action={
          <Button onClick={() => setParams({ meal: 'new' })} className="!px-3 !py-2">
            <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Ajouter</span>
          </Button>
        }
      />

      {/* Barre de filtres/tri, affichée seulement s'il y a des plats à filtrer. */}
      {!isLoading && !isError && total > 0 && (
        <MealsFilters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          favoritesOnly={favoritesOnly}
          onToggleFavoritesOnly={() => setFavoritesOnly((v) => !v)}
          sort={sort}
          onSortChange={setSort}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />
      )}

      <main className="flex-1 space-y-3 p-4">
        {isLoading ? (
          <FullScreenLoader />
        ) : isError && !meals ? (
          <ErrorState />
        ) : total === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Aucun plat"
            description="Créez votre premier plat ou importez un repas depuis un fichier JSON."
            action={
              <Button onClick={() => setParams({ meal: 'new' })}>
                <Plus className="h-4 w-4" /> Créer un plat
              </Button>
            }
          />
        ) : visibleMeals.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Aucun résultat"
            description="Aucun plat ne correspond à votre recherche ou à vos filtres."
            action={
              <Button variant="secondary" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" /> Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {visibleMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                layout="list"
                onClick={() => setParams({ details: meal.id })}
              />
            ))}
          </div>
        )}
      </main>

      <MealDetailsModal
        open={detailsOpen}
        meal={detailsMeal}
        onClose={closeDetails}
        onEditMeal={editMeal}
        onPlanMeal={planMeal}
      />

      {/* ?plan=<mealId> → planification du plat (plat présélectionné). */}
      <MealPlanningModal
        open={planningOpen}
        onClose={closePlanning}
        defaultMealId={planParam ?? undefined}
      />

      {/* ?meal=new → choix du mode d'ajout (IA ou manuel). */}
      <MealModeChoiceModal open={isChoosing} onClose={closeModal} onChoose={chooseAddMode} />

      {/* ?editchoice=<id> → choix du mode de modification (IA ou manuel). */}
      <MealModeChoiceModal
        open={isChoosingEdit}
        onClose={closeModal}
        onChoose={chooseEditMode}
        variant="edit"
      />

      {/* ?meal=ai (génération) ou ?mealai=<id> (modification IA). */}
      <MealAIGenerationModal
        open={isGeneratingWithAI || isEditingWithAI}
        onClose={closeModal}
        meal={isEditingWithAI ? editingAiMeal : null}
      />

      {/* ?meal=manual (création) ou ?meal=<id> (modification manuelle). */}
      <MealEditionModal
        meal={isCreatingManually ? null : editingMeal}
        open={isCreatingManually || Boolean(editingMeal)}
        onClose={closeModal}
      />
    </div>
  );
}
