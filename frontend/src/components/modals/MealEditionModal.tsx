import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Trash2, Plus, ImageIcon, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Textarea, Select } from '../ui/FormControl';
import { NumberStepper } from '../ui/NumberStepper';
import { FavoriteButton } from '../meals/FavoriteButton';
import {
  useCreateMeal,
  useUpdateMeal,
  useDeleteMeal,
  useUploadMealImage,
} from '../../api/meals';
import { fetchIngredientNutrition } from '../../api/ai';
import { DIFFICULTY_OPTIONS, CATEGORY_OPTIONS, AISLE_OPTIONS_LIST, UNIT_OPTIONS } from '../../lib/options';
import {
  computeMealNutrition,
  hasNutritionValues,
  parseIngredientNutrition,
  NutritionKey,
} from '../../lib/nutrition';
import type { Ingredient, IngredientNutrition, Meal, MealDraft, Step } from '../../types';

interface MealEditionModalProps {
  meal?: Meal | null; // null/undefined = création
  open: boolean;
  onClose: () => void;
}

/** Ingrédient en cours d'édition : la quantité peut être vidée le temps de la saisie. */
type DraftIngredient = Omit<Ingredient, 'quantity'> & { quantity?: number };

/** Brouillon interne : quantités d'ingrédients optionnelles pendant l'édition. */
type MealEditionDraft = Omit<MealDraft, 'ingredients'> & { ingredients: DraftIngredient[] };

/** Champs d'apports éditables par ingrédient (kcal, protéines, glucides, lipides, fibres). */
const NUTRIENT_FIELDS: readonly { key: NutritionKey; label: string }[] = [
  { key: 'calories', label: 'kcal' },
  { key: 'protein', label: 'Prot' },
  { key: 'carbs', label: 'Gluc' },
  { key: 'fat', label: 'Lip' },
  { key: 'fiber', label: 'Fib' },
];

/** Délai de frappe avant d'interroger Sonar (ms). */
const AI_DEBOUNCE_MS = 700;

/**
 * Clé identifiant le triplet interrogé auprès de Sonar (nom | quantité | unité).
 * Le rayon et les notes n'en font pas partie : aucun impact sur les apports.
 */
const nutritionKeyOf = (ing: DraftIngredient): string =>
  `${ing.name.trim().toLowerCase()}|${ing.quantity ?? ''}|${ing.unit.trim()}`;

const blankDraft = (): MealEditionDraft => ({
  name: '',
  description: '',
  servings: 2,
  prepTime: undefined,
  cookTime: undefined,
  totalTime: undefined,
  difficulty: undefined,
  category: undefined,
  nutrition: undefined,
  notes: '',
  ingredients: [],
  steps: [],
});

function toDraft(meal: Meal): MealEditionDraft {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description ?? '',
    servings: meal.servings,
    prepTime: meal.prepTime ?? undefined,
    cookTime: meal.cookTime ?? undefined,
    totalTime: meal.totalTime ?? undefined,
    difficulty: meal.difficulty ?? undefined,
    category: meal.category ?? undefined,
    nutrition: meal.nutrition ?? undefined,
    notes: meal.notes ?? '',
    ingredients: meal.ingredients.map((i) => ({ ...i })),
    steps: meal.steps.map((s) => ({ ...s })),
  };
}

const newIngredient = (): DraftIngredient => ({
  id: `ing-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: '',
  quantity: 1,
  unit: 'g',
  aisle: 'epicerie_seche',
  optional: false,
  notes: '',
});

const newStep = (n: number): Step => ({ stepNumber: n, instruction: '', time: undefined, ingredients: [] });

export function MealEditionModal({ meal, open, onClose }: MealEditionModalProps) {
  const isEdit = Boolean(meal);
  const [draft, setDraft] = useState<MealEditionDraft>(meal ? toDraft(meal) : blankDraft());
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(meal?.imageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  // Identifiant de l'ingrédient dont le bloc « Apports » est déplié.
  const [openNutritionId, setOpenNutritionId] = useState<string | null>(null);
  // ── Complétion IA (Sonar) des apports par ingrédient ──
  // Dernier triplet interrogé par ingrédient (évite les rappels redondants).
  const lastQueried = useRef<Map<string, string>>(new Map());
  // Minuteries de délai de frappe par ingrédient.
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  /** Consigne les triplets déjà connus : aucun appel IA tant que nom/qté/unité ne changent pas. */
  const markQueried = (ings: DraftIngredient[]) => {
    for (const ing of ings) lastQueried.current.set(ing.id, nutritionKeyOf(ing));
  };

  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();
  const uploadImage = useUploadMealImage();

  // (Ré)initialise l'état quand la modale s'ouvre ou change de repas.
  useEffect(() => {
    if (open) {
      const initial = meal ? toDraft(meal) : blankDraft();
      setDraft(initial);
      // Les ingrédients existants ne déclenchent pas d'appel IA d'office :
      // Seule une modification (nom, quantité, unité) re-questionne Sonar.
      markQueried(initial.ingredients);
      setPendingImage(null);
      setImagePreview(meal?.imageUrl ?? null);
      setError(null);
      setOpenNutritionId(null);
    }
  }, [open, meal]);

  // Quand un repas est fourni en édition mais ses données changent.
  useEffect(() => {
    if (meal) {
      const next = toDraft(meal);
      setDraft(next);
      markQueried(next.ingredients);
    }
  }, [meal]);

  // Annule les appels IA en attente au démontage de la modale.
  useEffect(() => () => debounceTimers.current.forEach((t) => clearTimeout(t)), []);

  const set = <K extends keyof MealDraft>(key: K, value: MealDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** Change les portions et met à l'échelle les quantités d'ingrédients. */
  const changeServings = (next: number) => {
    const prev = draft.servings || 1;
    const ratio = next / prev;
    setDraft((d) => ({
      ...d,
      servings: next,
      ingredients: d.ingredients.map((i) => ({
        ...i,
        quantity: i.quantity === undefined ? undefined : Math.round(i.quantity * ratio * 1000) / 1000,
      })),
    }));
    // Les quantités mises à l'échelle ne re-déclenchent pas d'appel IA :
    // les apports par ingrédient sont proportionnels (quantité de référence).
    markQueried(
      draft.ingredients.map((i) => ({
        ...i,
        quantity: i.quantity === undefined ? undefined : Math.round(i.quantity * ratio * 1000) / 1000,
      })),
    );
  };

  const updateIngredient = (idx: number, patch: Partial<DraftIngredient>) =>
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((i, k) => (k === idx ? { ...i, ...patch } : i)),
    }));

  const addIngredient = () => setDraft((d) => ({ ...d, ingredients: [...d.ingredients, newIngredient()] }));
  const removeIngredient = (idx: number) =>
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, k) => k !== idx) }));

  const updateStep = (idx: number, patch: Partial<Step>) =>
    setDraft((d) => ({ ...d, steps: (d.steps ?? []).map((s, k) => (k === idx ? { ...s, ...patch } : s)) }));
  const addStep = () =>
    setDraft((d) => ({ ...d, steps: [...(d.steps ?? []), newStep((d.steps?.length ?? 0) + 1)] }));
  const removeStep = (idx: number) =>
    setDraft((d) => ({
      ...d,
      steps: (d.steps ?? [])
        .filter((_, k) => k !== idx)
        .map((s, k) => ({ ...s, stepNumber: k + 1 })),
    }));

  // ── Complétion IA (Sonar) ─────────────────────────────────
  // Ajout manuel ou modification du nom, de la quantité ou de l'unité →
  // Sonar est interrogé (après délai de frappe) et remplit les apports,
  // qui restent éditables. Le rayon ne déclenche rien.
  useEffect(() => {
    for (const ing of draft.ingredients) {
      const { quantity } = ing;
      // Triplet incomplet : annule tout appel en attente pour cet ingrédient.
      if (ing.name.trim().length < 2 || quantity === undefined || quantity <= 0 || !ing.unit.trim()) {
        clearTimeout(debounceTimers.current.get(ing.id));
        debounceTimers.current.delete(ing.id);
        continue;
      }
      const key = nutritionKeyOf(ing);
      // Déjà interrogé pour ce triplet exact : pas de nouvel appel.
      if (lastQueried.current.get(ing.id) === key) continue;
      lastQueried.current.set(ing.id, key);

      const { id } = ing;
      const params = { name: ing.name.trim(), quantity, unit: ing.unit.trim() };
      clearTimeout(debounceTimers.current.get(id));
      debounceTimers.current.set(
        id,
        setTimeout(async () => {
          setAiLoading((s) => ({ ...s, [id]: true }));
          try {
            const nutrition = await fetchIngredientNutrition(params.name, params.quantity, params.unit);
            setDraft((d) => ({
              ...d,
              ingredients: d.ingredients.map((i) => {
                if (i.id !== id || !nutrition) return i;
                // N'écrase que si l'ingrédient n'a pas changé depuis la requête.
                if (nutritionKeyOf(i) !== key) return i;
                return { ...i, nutrition: { ...nutrition, quantity: params.quantity } };
              }),
            }));
          } catch {
            // Échec silencieux : les champs restent vides et éditables à la main.
          } finally {
            setAiLoading((s) => ({ ...s, [id]: false }));
          }
        }, AI_DEBOUNCE_MS),
      );
    }
  }, [draft.ingredients]);

  // ── Apports par portion ──────────────────────────────────
  // Calculés en direct depuis les apports portés par chaque ingrédient
  // (import JSON/IA ou saisie manuelle), ramenés à la quantité saisie.
  const liveNutrition = useMemo(
    () => computeMealNutrition(draft.ingredients, draft.servings),
    [draft.ingredients, draft.servings],
  );

  /** Modifie un apport d'ingrédient (champ vidable) ; verrouille la quantité de référence. */
  const setIngredientNutrition = (idx: number, key: NutritionKey, value: number | undefined) =>
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((i, k) => {
        if (k !== idx) return i;
        const next: IngredientNutrition = { ...(i.nutrition ?? {}) };
        if (value === undefined) delete next[key];
        else next[key] = value;
        // Les apports sont définis pour la quantité au moment de la saisie.
        if (next.quantity === undefined && i.quantity !== undefined) next.quantity = i.quantity;
        return { ...i, nutrition: hasNutritionValues(next) ? next : undefined };
      }),
    }));

  // ── Import JSON ──────────────────────────────────────────
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const importedIngredients: DraftIngredient[] = (parsed.ingredients ?? []).map((i: any) => {
          const quantity = Number.isFinite(Number(i.quantity)) ? Number(i.quantity) : undefined;
          return {
            id: String(i.id),
            name: i.name,
            quantity,
            unit: i.unit,
            aisle: i.aisle,
            optional: i.optional ?? false,
            notes: i.notes ?? '',
            // Apports par ingrédient (renseignés par l'IA en arrière-plan,
            // pour la quantité importée) — base du calcul des apports du plat.
            nutrition: parseIngredientNutrition(i.nutrition, quantity),
          };
        });
        setDraft({
          id: parsed.id,
          name: parsed.name ?? '',
          description: parsed.description ?? '',
          servings: parsed.servings ?? 2,
          prepTime: parsed.prepTime,
          cookTime: parsed.cookTime,
          totalTime: parsed.totalTime,
          difficulty: parsed.difficulty,
          category: parsed.category,
          nutrition: parsed.nutrition,
          notes: parsed.notes ?? '',
          ingredients: importedIngredients,
          steps: (parsed.steps ?? []).map((s: any) => ({
            stepNumber: s.stepNumber,
            instruction: s.instruction,
            time: s.time,
            ingredients: s.ingredients ?? [],
          })),
        });
        setError(null);
        // Les ingrédients importés ne sont pas re-questionnés tant que non modifiés.
        markQueried(importedIngredients);
      } catch {
        setError('Fichier JSON invalide. Vérifiez le format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Image ────────────────────────────────────────────────
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  // ── Sauvegarde ───────────────────────────────────────────
  const handleSave = async () => {
    setError(null);
    if (!draft.name.trim()) {
      setError('Le nom du plat est obligatoire.');
      return;
    }
    const namedIngredients = draft.ingredients.filter((i) => i.name.trim());
    if (namedIngredients.some((i) => i.quantity === undefined)) {
      setError('Renseigne une quantité pour chaque ingrédient (ou supprime la ligne).');
      return;
    }
    const cleanDraft: MealDraft = {
      ...draft,
      id: undefined, // le backend génère l'id si absent
      nutrition: liveNutrition ?? draft.nutrition, // apports ajustés aux quantités
      ingredients: namedIngredients.map((i) => ({ ...i, quantity: i.quantity as number })),
      steps: (draft.steps ?? []).filter((s) => s.instruction.trim()),
    };

    try {
      let saved: Meal;
      if (isEdit && meal) {
        saved = await updateMeal.mutateAsync({ id: meal.id, draft: cleanDraft });
      } else {
        saved = await createMeal.mutateAsync(cleanDraft);
      }
      // Upload d'une nouvelle image éventuelle.
      if (pendingImage) {
        await uploadImage.mutateAsync({ id: saved.id, file: pendingImage });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Échec de la sauvegarde.');
    }
  };

  const handleDelete = async () => {
    if (!meal) return;
    if (!confirm('Supprimer définitivement ce plat ? Les plannings associés seront aussi supprimés.')) return;
    try {
      await deleteMeal.mutateAsync(meal.id);
      onClose();
    } catch {
      setError('Échec de la suppression.');
    }
  };

  const saving = createMeal.isPending || updateMeal.isPending || uploadImage.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le plat' : 'Nouveau plat'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit ? (
            <Button variant="ghost" onClick={handleDelete} className="text-red-500" loading={deleteMeal.isPending}>
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

        {/* Barre d'actions principales */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportJson}
          />
          <Button variant="secondary" onClick={() => jsonInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Importer un JSON
          </Button>
          {isEdit && meal && (
            <FavoriteButton
              mealId={meal.id}
              isFavorite={meal.isFavorite}
              size="lg"
              className="bg-stone-100"
            />
          )}
        </div>

        {/* Image */}
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
            {imagePreview ? (
              <img src={imagePreview} alt="Aperçu" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-stone-300">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" /> {imagePreview ? 'Changer la photo' : 'Ajouter une photo'}
            </Button>
            {pendingImage && <p className="mt-1 text-xs text-stone-400">Photo prête à envoyer.</p>}
          </div>
        </div>

        {/* Champs principaux */}
        <Field label="Nom du plat *">
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Bol méditerranéen" />
        </Field>

        <Field label="Description">
          <Textarea value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Courte description du plat" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Portions">
            <NumberStepper value={draft.servings ?? 2} min={1} max={20} onChange={changeServings} />
          </Field>
          <Field label="Difficulté">
            <Select
              value={draft.difficulty ?? ''}
              onChange={(e) => set('difficulty', (e.target.value || undefined) as any)}
            >
              <option value="">—</option>
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Prép. (min)">
            <Input
              type="number"
              value={draft.prepTime ?? ''}
              onChange={(e) => set('prepTime', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <Field label="Cuisson (min)">
            <Input
              type="number"
              value={draft.cookTime ?? ''}
              onChange={(e) => set('cookTime', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <Field label="Total (min)">
            <Input
              type="number"
              value={draft.totalTime ?? ''}
              onChange={(e) => set('totalTime', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
        </div>

        <Field label="Catégorie">
          <Select value={draft.category ?? ''} onChange={(e) => set('category', (e.target.value || undefined) as any)}>
            <option value="">—</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        {/* Ingrédients */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label">Ingrédients</label>
            <button onClick={addIngredient} className="btn-ghost text-brand-600">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {draft.ingredients.map((ing, idx) => (
              <div key={ing.id + idx} className="rounded-xl border border-stone-200 bg-white p-2.5">
                <div className="flex items-start gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Nom"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                  />
                  <button
                    onClick={() => removeIngredient(idx)}
                    className="mt-1.5 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Supprimer l'ingrédient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Qté"
                    value={ing.quantity ?? ''}
                    onChange={(e) =>
                      updateIngredient(idx, { quantity: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                  />
                  <Select value={ing.unit} onChange={(e) => updateIngredient(idx, { unit: e.target.value })}>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    {!UNIT_OPTIONS.includes(ing.unit) && <option value={ing.unit}>{ing.unit}</option>}
                  </Select>
                  <Select value={ing.aisle} onChange={(e) => updateIngredient(idx, { aisle: e.target.value })}>
                    {AISLE_OPTIONS_LIST.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    {!AISLE_OPTIONS_LIST.some((o) => o.value === ing.aisle) && (
                      <option value={ing.aisle}>{ing.aisle}</option>
                    )}
                  </Select>
                </div>

                {/* Apports de l'ingrédient (repliés par défaut) — base du calcul des apports du plat */}
                {(() => {
                  const refQty = ing.nutrition?.quantity ?? ing.quantity;
                  return (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setOpenNutritionId(openNutritionId === ing.id ? null : ing.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400 hover:text-brand-600"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${openNutritionId === ing.id ? '' : '-rotate-90'}`}
                        />
                        Apports
                        {aiLoading[ing.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-label="Recherche des apports via Sonar" />
                        ) : hasNutritionValues(ing.nutrition) ? (
                          '· renseignés'
                        ) : ''}
                      </button>
                      {openNutritionId === ing.id && (
                        <div className="mt-1.5">
                          <p className="mb-1 text-[10px] text-stone-400">
                            {refQty !== undefined ? (
                              <>
                                Pour {refQty} {ing.unit} — macros en g. Les apports du plat suivent la quantité.
                              </>
                            ) : (
                              <>Renseigne d'abord une quantité.</>
                            )}
                          </p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {NUTRIENT_FIELDS.map(({ key, label }) => (
                              <Input
                                key={key}
                                type="number"
                                className="px-2 py-1.5 text-xs"
                                placeholder={label}
                                disabled={refQty === undefined}
                                value={ing.nutrition?.[key] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                                  setIngredientNutrition(idx, key, v !== undefined && Number.isFinite(v) ? v : undefined);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-stone-500">
                    <input
                      type="checkbox"
                      checked={ing.optional ?? false}
                      onChange={(e) => updateIngredient(idx, { optional: e.target.checked })}
                      className="h-4 w-4 rounded border-stone-300 text-brand-500"
                    />
                    Optionnel
                  </label>
                  <Input
                    className="flex-1 text-xs"
                    placeholder="Note (ex: coupé en dés)"
                    value={ing.notes ?? ''}
                    onChange={(e) => updateIngredient(idx, { notes: e.target.value })}
                  />
                </div>
              </div>
            ))}
            {draft.ingredients.length === 0 && (
              <p className="rounded-xl bg-stone-100 px-3 py-4 text-center text-xs text-stone-400">
                Aucun ingrédient. Cliquez sur « Ajouter ».
              </p>
            )}
          </div>

          {/* Apports par portion, ajustés en direct aux quantités */}
          {liveNutrition && (
            <div className="mt-3">
              <p className="label">
                Apports par portion{' '}
                <span className="font-normal normal-case tracking-normal text-stone-400">— ajustés aux quantités</span>
              </p>
              <div className="grid grid-cols-5 gap-2 text-center">
                {(
                  [
                    ['kcal', liveNutrition.calories],
                    ['Prot.', liveNutrition.protein],
                    ['Gluc.', liveNutrition.carbs],
                    ['Lip.', liveNutrition.fat],
                    ['Fibres', liveNutrition.fiber],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="rounded-xl bg-white py-2 shadow-card">
                    <p className="text-sm font-bold text-stone-800">{val ?? '—'}</p>
                    <p className="text-[10px] uppercase text-stone-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Étapes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label">Étapes</label>
            <button onClick={addStep} className="btn-ghost text-brand-600">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {(draft.steps ?? []).map((step, idx) => (
              <div key={idx} className="rounded-xl border border-stone-200 bg-white p-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {step.stepNumber}
                  </span>
                  <Textarea
                    className="min-h-[60px] flex-1"
                    placeholder="Instruction…"
                    value={step.instruction}
                    onChange={(e) => updateStep(idx, { instruction: e.target.value })}
                  />
                  <button
                    onClick={() => removeStep(idx)}
                    className="mt-1.5 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Supprimer l'étape"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 pl-8">
                  <Input
                    type="number"
                    className="w-28 text-xs"
                    placeholder="Temps (min)"
                    value={step.time ?? ''}
                    onChange={(e) => updateStep(idx, { time: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
            ))}
            {(draft.steps ?? []).length === 0 && (
              <p className="rounded-xl bg-stone-100 px-3 py-4 text-center text-xs text-stone-400">
                Aucune étape.
              </p>
            )}
          </div>
        </div>

        <Field label="Notes">
          <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Notes additionnelles" />
        </Field>
      </div>
    </Modal>
  );
}
