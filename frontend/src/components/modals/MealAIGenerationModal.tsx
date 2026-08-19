import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Save, Send, Sparkles, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/FormControl';
import { NumberStepper } from '../ui/NumberStepper';
import { MealDetailsContent } from '../meals/MealDetailsContent';
import { useFamilyMembers } from '../../api/family';
import { startMealJob, useMealJob, GenerateMealPayload } from '../../api/ai';
import { useCreateMeal, useUpdateMeal } from '../../api/meals';
import { getApiErrorMessage } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  loadAiMealSession,
  saveAiMealSession,
  clearAiMealSession,
  type ChatMessage,
} from '../../lib/aiMealSession';
import { useOptionList } from '../../hooks/useOptionList';
import { DIFFICULTY_OPTIONS } from '../../lib/options';
import type { Meal, MealDraft, Difficulty } from '../../types';
import type { FamilyMemberProfileView } from '../../types/family';
import { cn } from '../../lib/utils';

interface MealAIGenerationModalProps {
  open: boolean;
  onClose: () => void;
  /** Plat existant à modifier par IA (absent = création). */
  meal?: Meal | null;
}

/** Convertit un plat persisté en brouillon exploitable par l'IA / le PUT. */
function mealToDraft(meal: Meal): MealDraft {
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

const memberInfo = (m: FamilyMemberProfileView) => {
  const parts: string[] = [];
  if (m.dailyCalories) parts.push(`≈ ${m.dailyCalories} kcal/jour`);
  if (m.dailyProtein) parts.push(`≈ ${m.dailyProtein} g protéines/jour`);
  if (m.allergies?.trim()) parts.push(`Allergies : ${m.allergies.trim()}`);
  return parts.length ? parts.join(' · ') : 'Profil nutritionnel incomplet';
};

/** Copie dans le presse-papier, avec repli execCommand pour les vieux navigateurs. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // On tente le repli ci-dessous.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Cartes de sélection des membres (formulaire de génération + édition IA). */
function MemberPicker({
  members,
  loading,
  selectedIds,
  onToggle,
}: {
  members: FamilyMemberProfileView[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggle: (userId: string) => void;
}) {
  return (
    <Field label="Membres pris en compte">
      {loading ? (
        <p className="text-sm text-stone-400">Chargement des membres…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-stone-400">Aucun profil trouvé.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const checked = selectedIds.has(m.userId);
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => onToggle(m.userId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition',
                  checked ? 'border-brand-400 bg-brand-50/50' : 'border-stone-200 hover:border-stone-300',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition',
                    checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 text-transparent',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                {m.photoUrl ? (
                  <img src={m.photoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-stone-800">
                    {m.fullName?.trim() || 'Membre'}
                    {m.isSelf && <span className="ml-1.5 text-xs font-normal text-brand-600">(moi)</span>}
                  </span>
                  <span className="block truncate text-xs text-stone-500">{memberInfo(m)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}

/**
 * Génération / modification d'un plat par IA :
 * - création : 1. formulaire (membres, portions, contraintes optionnelles) ;
 *   2. plat généré en lecture seule + chat pour affiner, puis « Enregistrer » ;
 * - modification (`meal` fourni) : le plat existant est affiché d'emblée,
 *   le chat décrit les modifications à appliquer, puis « Enregistrer les
 *   modifications » remplace le plat via PUT.
 *
 * La génération tourne côté serveur (job) : fermer la modale ou quitter
 * l'app ne l'interrompt pas — la session est persistée en IndexedDB et
 * restaurée à la réouverture (même état que si l'on était resté).
 */
export function MealAIGenerationModal({ open, onClose, meal }: MealAIGenerationModalProps) {
  const isEdit = Boolean(meal);
  const { data: members, isLoading: membersLoading } = useFamilyMembers();
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const userId = useAuthStore((s) => s.user?.id);
  // Catégories paramétrables de la famille (l'IA les respecte).
  const { options: categoryOptions } = useOptionList('category');

  // ── Formulaire (création) ─────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [servings, setServings] = useState(2);
  const [difficulty, setDifficulty] = useState<'' | Difficulty>('');
  const [category, setCategory] = useState<'' | string>('');
  const [desiredIngredients, setDesiredIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');
  const [description, setDescription] = useState('');

  // ── Résultat + chat ───────────────────────────────────────
  const [generated, setGenerated] = useState<MealDraft | null>(null);
  const [viewServings, setViewServings] = useState(2);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Job de génération en cours (côté serveur) + hydratation de session.
  const [activeJob, setActiveJob] = useState<{ id: string; kind: 'generate' | 'feedback' } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Vrai après une fermeture volontaire sans job en cours : la session
  // est effacée et ne doit pas être réécrite par l'effet de persistance.
  const discardedRef = useRef(false);

  // À l'ouverture : état par défaut, puis restauration de la session
  // persistée si elle correspond au même mode / même plat.
  useEffect(() => {
    if (!open) return;
    discardedRef.current = false;
    setHydrated(false);
    setSelectedIds(new Set());
    setServings(meal?.servings ?? 2);
    setDifficulty('');
    setCategory('');
    setDesiredIngredients([]);
    setIngredientInput('');
    setDescription('');
    setGenerated(meal ? mealToDraft(meal) : null);
    setViewServings(meal?.servings ?? 2);
    setChat(
      meal
        ? [
            {
              role: 'assistant',
              text: 'Voici le plat actuel. Décris la modification souhaitée (ex : « remplacer la crème par du lait de coco »).',
            },
          ]
        : [],
    );
    setFeedback('');
    setError(null);
    setActiveJob(null);

    let cancelled = false;
    if (!userId) {
      setHydrated(true);
    } else {
      loadAiMealSession(userId)
        .then((session) => {
          if (cancelled) return;
          const sameTarget =
            session &&
            session.mode === (meal ? 'edit' : 'create') &&
            session.mealId === (meal?.id ?? undefined);
          if (session && sameTarget) {
            setSelectedIds(new Set(session.form.selectedIds));
            setServings(session.form.servings);
            setDifficulty(session.form.difficulty as '' | Difficulty);
            setCategory(session.form.category);
            setDesiredIngredients(session.form.desiredIngredients);
            setDescription(session.form.description);
            setGenerated(session.generated ?? (meal ? mealToDraft(meal) : null));
            setViewServings(session.viewServings);
            setChat(session.chat);
            setActiveJob(session.activeJob);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setHydrated(true);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meal?.id]);

  // Par défaut : moi seul(e) sélectionné(e) (jamais après restauration
  // d'une session — le choix persisté prime, même vide).
  useEffect(() => {
    if (!open || !members || hydrated || selectedIds.size > 0) return;
    setSelectedIds(new Set(members.filter((m) => m.isSelf).map((m) => m.userId)));
  }, [open, members, hydrated, selectedIds.size]);

  // Persistance continue : la session survit à la fermeture de l'app.
  // On n'écrit que si quelque chose est en jeu (job en cours ou chat
  // entamé) — un simple formulaire jamais lancé n'est pas conservé.
  useEffect(() => {
    if (!hydrated || !userId || discardedRef.current) return;
    if (activeJob === null && !chat.some((m) => m.role === 'user')) return;
    void saveAiMealSession(userId, {
      mode: isEdit ? 'edit' : 'create',
      mealId: isEdit && meal ? meal.id : undefined,
      form: {
        selectedIds: [...selectedIds],
        servings,
        difficulty,
        category,
        desiredIngredients,
        description,
      },
      generated,
      viewServings,
      chat,
      activeJob,
    }).catch(() => undefined);
  }, [
    hydrated, userId, activeJob, chat, generated, viewServings,
    selectedIds, servings, difficulty, category, desiredIngredients, description,
    isEdit, meal,
  ]);

  // ── Suivi du job serveur (polling) ────────────────────────
  const mealJob = useMealJob(activeJob?.id ?? null);
  const jobData = mealJob.data;

  useEffect(() => {
    if (!activeJob || !jobData || jobData.status === 'running') return;
    if (jobData.status === 'done' && jobData.meal) {
      setGenerated(jobData.meal);
      setViewServings(jobData.meal.servings ?? servings);
      if (activeJob.kind === 'feedback') {
        setChat((prev) => [
          ...prev,
          { role: 'assistant', text: isEdit ? 'Plat modifié en tenant compte de ta demande.' : 'Plat régénéré en tenant compte de ta demande.' },
        ]);
      }
    } else {
      setError(jobData.error ?? 'La génération a échoué, réessaie');
    }
    setActiveJob(null);
  }, [activeJob, jobData, isEdit, servings]);

  const toggleMember = (memberUserId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberUserId)) next.delete(memberUserId);
      else next.add(memberUserId);
      return next;
    });
  };

  const addIngredient = () => {
    const value = ingredientInput.trim();
    if (!value || desiredIngredients.length >= 20) return;
    if (!desiredIngredients.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setDesiredIngredients((prev) => [...prev, value]);
    }
    setIngredientInput('');
  };

  /** Paramètres du formulaire, communs à la génération et aux régénérations. */
  const buildPayload = (): GenerateMealPayload => ({
    memberIds: [...selectedIds],
    servings,
    difficulty: difficulty || undefined,
    category: category || undefined,
    desiredIngredients: desiredIngredients.length ? desiredIngredients : undefined,
    description: description.trim() || undefined,
  });

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      setError('Sélectionne au moins un membre');
      return;
    }
    setError(null);
    try {
      const jobId = await startMealJob(buildPayload());
      setActiveJob({ id: jobId, kind: 'generate' });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSendFeedback = async () => {
    const text = feedback.trim();
    if (!text || !generated || activeJob) return;
    if (selectedIds.size === 0) {
      setError('Sélectionne au moins un membre');
      return;
    }
    setChat((prev) => [...prev, { role: 'user', text }]);
    setFeedback('');
    setError(null);
    try {
      const payload: GenerateMealPayload = isEdit
        ? { memberIds: [...selectedIds], servings: meal!.servings, previousMeal: generated, feedback: text }
        : { ...buildPayload(), previousMeal: generated, feedback: text };
      const jobId = await startMealJob(payload);
      setActiveJob({ id: jobId, kind: 'feedback' });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSave = async () => {
    if (!generated) return;
    setError(null);
    try {
      if (isEdit && meal) {
        // PUT : remplace ingrédients/étapes, préserve image et favori.
        await updateMeal.mutateAsync({ id: meal.id, draft: { ...generated, id: undefined } });
      } else {
        await createMeal.mutateAsync({ ...generated, id: undefined });
      }
      // Plat enregistré : la session n'a plus raison d'être.
      if (userId) {
        discardedRef.current = true;
        void clearAiMealSession(userId).catch(() => undefined);
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  /**
   * Fermeture volontaire : si un job tourne, la session est conservée
   * (la génération continue, reprise au retour) ; sinon on repart de
   * zéro à la prochaine ouverture.
   */
  const handleClose = () => {
    if (activeJob === null && userId) {
      discardedRef.current = true;
      void clearAiMealSession(userId).catch(() => undefined);
    }
    onClose();
  };

  // ── Copie d'une bulle du chat (clic) ──────────────────────
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  const handleCopyBubble = async (text: string, index: number) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedIndex(index);
    window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedIndex(null), 1500);
  };

  // ── Rendu ─────────────────────────────────────────────────

  const errorBanner = error && (
    <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
  );

  const pending = activeJob !== null;

  /** En édition, le plat existe d'emblée : phase résultat directe. */
  const showResult = isEdit || Boolean(generated) || pending;
  const saving = createMeal.isPending || updateMeal.isPending;

  // ── Phase 1 : formulaire (création) ───────────────────────
  const formFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" onClick={handleClose}>Annuler</Button>
      <Button onClick={handleGenerate} loading={pending}>
        <Sparkles className="h-4 w-4" /> Générer
      </Button>
    </div>
  );

  const formBody = (
    <div className="space-y-4">
      {errorBanner}

      {/* Membres de la famille */}
      <MemberPicker
        members={members ?? []}
        loading={membersLoading}
        selectedIds={selectedIds}
        onToggle={toggleMember}
      />

      {/* Portions */}
      <div className="rounded-2xl bg-brand-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-brand-700">Nombre de portions</span>
          <NumberStepper value={servings} min={1} max={50} onChange={setServings} />
        </div>
        {selectedIds.size > 0 && (
          <p className="mt-1.5 text-xs text-brand-600">
            ≈ {Math.round((servings / selectedIds.size) * 10) / 10} portion(s) par membre sélectionné
          </p>
        )}
      </div>

      {/* Difficulté + catégorie (optionnels) */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Difficulté (optionnel)">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as '' | Difficulty)}>
            <option value="">Non définie</option>
            {DIFFICULTY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Catégorie (optionnel)">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Non définie</option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Ingrédients souhaités (optionnel) */}
      <Field label="Ingrédients souhaités (optionnel)">
        <div className="flex gap-2">
          <Input
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addIngredient();
              }
            }}
            placeholder="Ex : poulet, quinoa…"
            maxLength={80}
          />
          <Button variant="secondary" onClick={addIngredient} type="button" aria-label="Ajouter l'ingrédient">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {desiredIngredients.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {desiredIngredients.map((ing) => (
              <span
                key={ing}
                className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700"
              >
                {ing}
                <button
                  type="button"
                  onClick={() => setDesiredIngredients((prev) => prev.filter((i) => i !== ing))}
                  className="text-brand-500 transition hover:text-brand-700"
                  aria-label={`Retirer ${ing}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Description libre (optionnel) */}
      <Field label="Description (optionnel)">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : un bol végétarien riche en protéines, style méditerranéen…"
          maxLength={1000}
        />
      </Field>
    </div>
  );

  // ── Phase 2 : plat (généré ou à modifier) + chat ──────────
  const resultFooter = (
    <div className="space-y-2">
      {chat.length > 0 && (
        <div className="max-h-24 space-y-1.5 overflow-y-auto">
          {chat.map((msg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleCopyBubble(msg.text, i)}
              title="Copier le message"
              aria-label="Copier le message"
              className={cn(
                'flex w-fit max-w-[85%] items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-xs leading-relaxed transition',
                msg.role === 'user'
                  ? 'ml-auto bg-brand-500 text-white'
                  : 'bg-stone-100 text-stone-600',
                copiedIndex === i && 'ring-2 ring-brand-300',
              )}
            >
              <span>{msg.text}</span>
              {copiedIndex === i ? (
                <Check className="h-3 w-3 shrink-0" aria-label="Copié" />
              ) : null}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendFeedback();
            }
          }}
          placeholder={isEdit ? 'Ex : remplacer la crème par du lait de coco…' : 'Ex : plus de protéines, sans lactose…'}
          disabled={pending}
          maxLength={1000}
        />
        <Button
          variant="secondary"
          onClick={handleSendFeedback}
          loading={pending}
          disabled={!feedback.trim()}
          aria-label="Envoyer la consigne"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <Button className="w-full" onClick={handleSave} loading={saving} disabled={!generated}>
        <Save className="h-4 w-4" /> {isEdit ? 'Enregistrer les modifications' : 'Enregistrer le plat'}
      </Button>
    </div>
  );

  const resultBody = !isEdit && pending && !generated ? (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Sparkles className="h-8 w-8 animate-pulse text-brand-500" />
      <p className="text-sm font-semibold text-stone-700">Génération du plat en cours…</p>
      <p className="text-xs text-stone-400">
        Tu peux quitter l'app : la génération continue et se retrouvera ici.
      </p>
    </div>
  ) : generated ? (
    <div className="space-y-4">
      {errorBanner}
      {pending && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
          <Sparkles className="h-4 w-4 animate-pulse" /> {isEdit ? 'Modification du plat en cours…' : 'Régénération en cours…'}
        </div>
      )}
      {isEdit && (
        <MemberPicker
          members={members ?? []}
          loading={membersLoading}
          selectedIds={selectedIds}
          onToggle={toggleMember}
        />
      )}
      <MealDetailsContent meal={generated} servings={viewServings} onServingsChange={setViewServings} maxServings={50} />
    </div>
  ) : (
    <div className="space-y-4">
      {errorBanner}
      <p className="text-sm text-stone-500">Aucun plat généré. Relance une génération.</p>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Modifier avec l’IA' : generated ? 'Plat généré' : 'Générer avec IA'}
      footer={showResult ? resultFooter : formFooter}
    >
      {showResult ? resultBody : formBody}
    </Modal>
  );
}
