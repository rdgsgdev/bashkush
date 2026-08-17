import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Select } from '../ui/FormControl';
import { NumberStepper } from '../ui/NumberStepper';
import { MealCarousel } from '../meals/MealCarousel';
import { DateRangePicker } from '../calendar/DateRangePicker';
import { STATUS_OPTIONS, MEAL_TYPE_OPTIONS } from '../../lib/options';
import { todayValue, cn, formatQty } from '../../lib/utils';
import { useCreateMealPlan, useUpdateMealPlan, useDeleteMealPlan } from '../../api/mealPlans';
import type { IngredientSelection } from '../../api/mealPlans';
import { useMeals } from '../../api/meals';
import { useConnection } from '../../hooks/useConnection';
import { AISLE_LABELS, AISLE_OPTIONS } from '../../types';
import type { Ingredient, Meal, MealPlan, MealPlanStatus, MealType } from '../../types';

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
  const [mealType, setMealType] = useState<MealType | ''>((plan?.mealType ?? '') as MealType | '');
  const [error, setError] = useState<string | null>(null);
  // Étape 2 : sélection des ingrédients à envoyer en liste de courses.
  const [step, setStep] = useState<1 | 2>(1);
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, string>>({});

  const createPlan = useCreateMealPlan();
  const updatePlan = useUpdateMealPlan();
  const deletePlan = useDeleteMealPlan();

  // La planification génère la liste de courses côté serveur : connexion requise.
  const { status: connectionStatus } = useConnection();
  const offline = connectionStatus !== 'online';

  // Ingrédients du plat sélectionné (cache meals, fallback : plat du plan édité).
  const { data: mealsCache } = useMeals();
  const selectedMeal =
    mealsCache?.find((m) => m.id === mealId) ?? (plan && plan.mealId === mealId ? plan.meal : undefined);
  const ingredients: Ingredient[] = useMemo(
    () => selectedMeal?.ingredients ?? [],
    [selectedMeal],
  );

  // Édition : la liste de courses n'est recalculée que si portions ou plat changent.
  const mealChanged = Boolean(plan && mealId !== plan.mealId);
  const servingsChanged = Boolean(plan && servings !== plan.servings);
  const needsIngredientStep = !plan || mealChanged || servingsChanged;

  const mealServings = selectedMeal && selectedMeal.servings > 0 ? selectedMeal.servings : 1;
  /** Quantité par défaut, mise à l'échelle comme côté backend (3 décimales). */
  const defaultQty = (ing: Ingredient) =>
    Math.round(ing.quantity * (servings / mealServings) * 1000) / 1000;

  useEffect(() => {
    if (open) {
      const fb = defaultDate ?? todayValue();
      setMealId(plan?.mealId ?? '');
      setFromDate(toDateOnly(plan?.fromDate) ?? fb);
      setToDate(toDateOnly(plan?.toDate) ?? fb);
      setServings(plan?.servings ?? 2);
      setStatus((plan?.status ?? 'a_faire') as MealPlanStatus);
      setMealType((plan?.mealType ?? '') as MealType | '');
      setError(null);
      setStep(1);
      setUnchecked(new Set());
      setQtyOverrides({});
    }
  }, [open, plan, defaultDate]);

  // Changement de plat pendant la session : sélection par défaut. En édition du
  // plat d'origine, on restaure la mémoire (ingrédients déjà contributionnés).
  useEffect(() => {
    if (!open) return;
    const contribIds = new Set(
      plan && plan.mealId === mealId ? (plan.contributions ?? []).map((c) => c.ingredientId) : [],
    );
    setUnchecked(new Set(ingredients.filter((i) => !contribIds.has(i.id)).map((i) => i.id)));
    setQtyOverrides({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, open]);

  // Changement de portions : les quantités par défaut changent → on repart des
  // valeurs mises à l'échelle (les décochages, eux, sont conservés).
  useEffect(() => {
    if (!open) return;
    setQtyOverrides({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servings, open]);

  /** Enregistre le plan (création ou édition) en une seule requête. */
  const save = async (selections?: IngredientSelection[]) => {
    setError(null);
    try {
      if (isEdit && plan) {
        await updatePlan.mutateAsync({
          id: plan.id,
          input: {
            mealId,
            fromDate,
            toDate,
            servings,
            status,
            mealType: mealType || null,
            // Sans sélection (édition sans changement portions/plat), le backend
            // ne touche pas aux contributions existantes.
            ...(selections ? { ingredients: selections } : {}),
          },
        });
      } else {
        await createPlan.mutateAsync({
          mealId,
          fromDate,
          toDate,
          servings,
          status,
          mealType: mealType || null,
          ingredients: selections ?? [],
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Échec de la planification.');
    }
  };

  /** Valide l'étape 1, puis passe à la sélection d'ingrédients (ou enregistre). */
  const handleContinue = () => {
    setError(null);
    if (!mealId) {
      setError('Sélectionnez un plat dans le carrousel.');
      return;
    }
    if (toDate < fromDate) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }
    if (needsIngredientStep) setStep(2);
    else void save();
  };

  /** Étape 2 : construit la sélection et enregistre tout en une fois. */
  const handleConfirm = () => {
    setError(null);
    const selections: IngredientSelection[] = [];
    for (const ing of ingredients) {
      if (unchecked.has(ing.id)) continue;
      const raw = qtyOverrides[ing.id];
      const qty = raw === undefined ? defaultQty(ing) : Number(raw);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(`Quantité invalide pour « ${ing.name} » : elle doit être un nombre positif.`);
        return;
      }
      selections.push({ id: ing.id, quantity: qty });
    }
    void save(selections);
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

  const toggle = (id: string) =>
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allUnchecked = ingredients.length > 0 && ingredients.every((i) => unchecked.has(i.id));
  const toggleAll = () =>
    setUnchecked(allUnchecked ? new Set() : new Set(ingredients.map((i) => i.id)));
  const selectedCount = ingredients.filter((i) => !unchecked.has(i.id)).length;

  /** Regroupe les ingrédients par rayon (rayons connus en premier, puis customs). */
  const aisleGroups = useMemo(() => {
    const byAisle = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      const key = ing.aisle || 'autre';
      if (!byAisle.has(key)) byAisle.set(key, []);
      byAisle.get(key)!.push(ing);
    }
    const known = AISLE_OPTIONS.filter((a) => byAisle.has(a));
    const custom = [...byAisle.keys()].filter((a) => !AISLE_OPTIONS.includes(a)).sort();
    return [...known, ...custom].map((a) => ({ aisle: a, label: AISLE_LABELS[a] ?? a, items: byAisle.get(a)! }));
  }, [ingredients]);

  const saving = createPlan.isPending || updatePlan.isPending;

  const errorBanner = error && (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );

  const stepProgress = (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1.5">
        <div className={cn('h-1.5 flex-1 rounded-full', step >= 1 ? 'bg-brand-500' : 'bg-stone-200')} />
        <div className={cn('h-1.5 flex-1 rounded-full', step >= 2 ? 'bg-brand-500' : 'bg-stone-200')} />
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-stone-400">Étape {step}/2</span>
    </div>
  );

  // ── Étape 1 : formulaire de planification ──────────────────
  const formFooter = (
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
        <Button onClick={handleContinue} loading={saving} disabled={offline}>
          {needsIngredientStep ? 'Continuer' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );

  const formBody = (
    <div className="space-y-5">
      {errorBanner}
      {stepProgress}

      <div>
        <label className="label">Choisissez un plat</label>
        <MealCarousel selectedId={mealId} onSelect={(m) => setMealId(m.id)} />
      </div>

      <Field label="Jour(s) planifié(s)">
        <DateRangePicker
          from={fromDate}
          to={toDate}
          onChange={(f, t) => {
            setFromDate(f);
            setToDate(t);
          }}
        />
      </Field>

      <Field label="Portions">
        <NumberStepper value={servings} min={1} max={10} onChange={setServings} />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Statut">
          <Select value={status} onChange={(e) => setStatus(e.target.value as MealPlanStatus)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type de repas">
          <Select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType | '')}
          >
            <option value="">—</option>
            {MEAL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
        ℹ️ À l'étape suivante, vous choisirez les ingrédients à ajouter à votre liste de courses
        (proportionnels au nombre de portions) et pourrez ajuster leurs quantités.
      </p>

      {offline && (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          ⚠️ Connexion requise : la planification génère la liste de courses côté serveur.
        </p>
      )}
    </div>
  );

  // ── Étape 2 : sélection des ingrédients ────────────────────
  const ingredientsFooter = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" onClick={() => setStep(1)}>
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>
      <Button onClick={handleConfirm} loading={saving} disabled={offline}>
        Enregistrer la planification
      </Button>
    </div>
  );

  const ingredientsBody = (
    <div className="space-y-4">
      {errorBanner}
      {stepProgress}

      <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
        ℹ️ Cochez les ingrédients à envoyer vers votre liste de courses — proportionnés pour{' '}
        {servings} portion{servings > 1 ? 's' : ''} — et ajustez les quantités si besoin
        (ex : ce que vous avez déjà dans votre garde-manger).
      </p>

      {ingredients.length === 0 ? (
        <p className="text-sm text-stone-400">Ce plat n'a aucun ingrédient.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-500">
              {selectedCount} / {ingredients.length} sélectionné{selectedCount > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-brand-600 transition hover:underline"
            >
              {allUnchecked ? 'Tout cocher' : 'Tout décocher'}
            </button>
          </div>

          {aisleGroups.map((g) => (
            <div key={g.aisle} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-400">{g.label}</h3>
              <ul className="space-y-2">
                {g.items.map((ing) => {
                  const checked = !unchecked.has(ing.id);
                  return (
                    <li
                      key={ing.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-card transition',
                        !checked && 'opacity-60',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(ing.id)}
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition',
                          checked
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-stone-300 text-transparent',
                        )}
                        aria-label={checked ? `Retirer ${ing.name}` : `Ajouter ${ing.name}`}
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800">{ing.name}</p>
                        {ing.optional && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                            facultatif
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={qtyOverrides[ing.id] ?? formatQty(defaultQty(ing))}
                          onChange={(e) =>
                            setQtyOverrides((prev) => ({ ...prev, [ing.id]: e.target.value }))
                          }
                          disabled={!checked}
                          className="field w-20 py-1.5 text-right text-sm tabular-nums disabled:bg-stone-100 disabled:text-stone-400"
                          aria-label={`Quantité de ${ing.name}`}
                        />
                        <span className="max-w-16 truncate text-xs text-stone-400">{ing.unit}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <p className="text-xs text-stone-400">
            Les ingrédients décochés ne seront pas ajoutés à votre liste de courses. Les cochés y
            seront fusionnés par nom et regroupés par rayon. La planification n'est enregistrée
            qu'au moment où vous appuyez sur « Enregistrer la planification ».
          </p>
        </>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 2 ? 'Ingrédients du plat' : isEdit ? 'Modifier la planification' : 'Planifier un plat'}
      footer={step === 2 ? ingredientsFooter : formFooter}
    >
      {step === 2 ? ingredientsBody : formBody}
    </Modal>
  );
}
