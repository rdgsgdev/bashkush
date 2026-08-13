import { useEffect, useState } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Select } from '../ui/FormControl';
import { NumberStepper } from '../ui/NumberStepper';
import { MealCarousel } from '../meals/MealCarousel';
import { STATUS_OPTIONS } from '../../lib/options';
import { todayValue } from '../../lib/utils';
import { useCreateMealPlan, useUpdateMealPlan, useDeleteMealPlan } from '../../api/mealPlans';
import type { Meal, MealPlan, MealPlanStatus } from '../../types';

interface MealPlanningModalProps {
  plan?: MealPlan | null; // null = création
  meals?: Meal[];
  open: boolean;
  onClose: () => void;
  /** Date par défaut en création (ex: jour sélectionné dans le calendrier). */
  defaultDate?: string;
}

/**
 * Extrait la partie YYYY-MM-DD d'une date ISO sans passer par l'objet Date
 * (évite le décalage de fuseau horaire qui décrémente le jour d'un).
 */
const toDateOnly = (iso?: string | null): string | undefined =>
  iso ? iso.slice(0, 10) : undefined;

export function MealPlanningModal({ plan, open, onClose, defaultDate }: MealPlanningModalProps) {
  const isEdit = Boolean(plan);
  const fallback = defaultDate ?? todayValue();
  const [mealId, setMealId] = useState<string>(plan?.mealId ?? '');
  const [fromDate, setFromDate] = useState<string>(toDateOnly(plan?.fromDate) ?? fallback);
  const [toDate, setToDate] = useState<string>(toDateOnly(plan?.toDate) ?? fallback);
  const [servings, setServings] = useState<number>(plan?.servings ?? 2);
  const [status, setStatus] = useState<MealPlanStatus>((plan?.status ?? 'a_faire') as MealPlanStatus);
  const [error, setError] = useState<string | null>(null);

  const createPlan = useCreateMealPlan();
  const updatePlan = useUpdateMealPlan();
  const deletePlan = useDeleteMealPlan();

  useEffect(() => {
    if (open) {
      const fb = defaultDate ?? todayValue();
      setMealId(plan?.mealId ?? '');
      setFromDate(toDateOnly(plan?.fromDate) ?? fb);
      setToDate(toDateOnly(plan?.toDate) ?? fb);
      setServings(plan?.servings ?? 2);
      setStatus((plan?.status ?? 'a_faire') as MealPlanStatus);
      setError(null);
    }
  }, [open, plan, defaultDate]);

  const handleSave = async () => {
    setError(null);
    if (!mealId) {
      setError('Sélectionnez un plat dans le carrousel.');
      return;
    }
    if (toDate < fromDate) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }
    try {
      if (isEdit && plan) {
        await updatePlan.mutateAsync({
          id: plan.id,
          input: { mealId, fromDate, toDate, servings, status },
        });
      } else {
        await createPlan.mutateAsync({ mealId, fromDate, toDate, servings, status });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Échec de la planification.');
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    if (!confirm('Supprimer cette planification ? Les ingrédients associés seront retirés de la liste de courses.')) return;
    try {
      await deletePlan.mutateAsync(plan.id);
      onClose();
    } catch {
      setError('Échec de la suppression.');
    }
  };

  const saving = createPlan.isPending || updatePlan.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la planification' : 'Planifier un plat'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit ? (
            <Button variant="ghost" onClick={handleDelete} className="text-red-500" loading={deletePlan.isPending}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Enregistrer
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="label">Choisissez un plat</label>
          <MealCarousel selectedId={mealId} onSelect={(m) => setMealId(m.id)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Du">
            <input
              type="date"
              className="field min-w-0"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Field>
          <Field label="Au">
            <input
              type="date"
              className="field min-w-0"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Portions">
          <NumberStepper value={servings} min={1} max={10} onChange={setServings} />
        </Field>

        <Field label="Statut">
          <Select value={status} onChange={(e) => setStatus(e.target.value as MealPlanStatus)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
          ℹ️ Les ingrédients du plat seront automatiquement ajoutés à votre liste de courses
          (proportionnels au nombre de portions), puis regroupés par rayon.
        </p>
      </div>
    </Modal>
  );
}
