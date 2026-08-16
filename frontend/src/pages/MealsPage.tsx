import { useSearchParams } from 'react-router-dom';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MealCard } from '../components/meals/MealCard';
import { MealEditionModal } from '../components/modals/MealEditionModal';
import { MealDetailsModal } from '../components/modals/MealDetailsModal';
import { MealModeChoiceModal } from '../components/modals/MealModeChoiceModal';
import { MealAIGenerationModal } from '../components/modals/MealAIGenerationModal';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { useMeals } from '../api/meals';

export function MealsPage() {
  const [params, setParams] = useSearchParams();
  const { data: meals, isLoading, isError } = useMeals();

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

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title="Mes plats"
        subtitle={`${meals?.length ?? 0} plat${(meals?.length ?? 0) > 1 ? 's' : ''}`}
        action={
          <Button onClick={() => setParams({ meal: 'new' })} className="!px-3 !py-2">
            <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Ajouter</span>
          </Button>
        }
      />

      <main className="flex-1 space-y-3 p-4">
        {isLoading ? (
          <FullScreenLoader />
        ) : isError ? (
          <ErrorState />
        ) : (meals?.length ?? 0) === 0 ? (
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
        ) : (
          <div className="space-y-3">
            {meals!.map((meal) => (
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
