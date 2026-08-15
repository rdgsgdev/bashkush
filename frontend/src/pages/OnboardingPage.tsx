import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/FormControl';
import { SingleChoice, MultiChoice, type ChoiceOption } from '../components/onboarding/Choice';
import { useProfile, useSaveProfile } from '../api/profile';
import type { ProfileDraft } from '../types/profile';
import {
  SEX_LABELS,
  ACTIVITY_LEVEL_LABELS,
  WEEKLY_ACTIVITY_LABELS,
  FITNESS_LEVEL_LABELS,
  GOAL_LABELS,
  MEDICAL_CONDITION_LABELS,
  MEAL_FREQUENCY_LABELS,
  FOOD_CHOICE_LABELS,
} from '../types/profile';

const toOptions = (labels: Record<string, string>): ChoiceOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

interface StepDef {
  title: string;
  subtitle: string;
  /** Champs couverts par l'étape (vidés si l'utilisateur la passe). */
  fields: (keyof ProfileDraft)[];
  render: (draft: ProfileDraft, set: (patch: Partial<ProfileDraft>) => void) => JSX.Element;
}

const STEPS: StepDef[] = [
  {
    title: 'Qui es-tu ?',
    subtitle: 'Parle-nous un peu de toi.',
    fields: ['fullName', 'birthDate', 'sex'],
    render: (draft, set) => (
      <>
        <Field label="Nom complet">
          <Input
            value={draft.fullName ?? ''}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="Ex : Sébastien Dangeuger"
          />
        </Field>
        <Field label="Date de naissance">
          <Input
            type="date"
            value={draft.birthDate ?? ''}
            onChange={(e) => set({ birthDate: e.target.value })}
          />
        </Field>
        <SingleChoice
          legend="Sexe"
          value={draft.sex}
          options={toOptions(SEX_LABELS)}
          onChange={(sex) => set({ sex: sex as ProfileDraft['sex'] })}
        />
      </>
    ),
  },
  {
    title: 'Ta corpulence',
    subtitle: 'Quelques mesures pour mieux te connaître.',
    fields: ['heightCm', 'weightKg'],
    render: (draft, set) => (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Taille (cm)">
          <Input
            type="number"
            inputMode="numeric"
            value={draft.heightCm ?? ''}
            onChange={(e) => set({ heightCm: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="175"
          />
        </Field>
        <Field label="Poids (kg)">
          <Input
            type="number"
            inputMode="decimal"
            value={draft.weightKg ?? ''}
            onChange={(e) => set({ weightKg: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="72"
          />
        </Field>
      </div>
    ),
  },
  {
    title: 'Ton niveau d’activité',
    subtitle: 'Comment décrirais-tu ton rythme de vie ?',
    fields: ['activityLevel', 'weeklyActivity', 'fitnessLevel'],
    render: (draft, set) => (
      <>
        <SingleChoice
          legend="Niveau d’activité"
          value={draft.activityLevel}
          options={toOptions(ACTIVITY_LEVEL_LABELS)}
          onChange={(v) => set({ activityLevel: v as ProfileDraft['activityLevel'] })}
        />
        <SingleChoice
          legend="Activité hebdomadaire"
          value={draft.weeklyActivity}
          options={toOptions(WEEKLY_ACTIVITY_LABELS)}
          onChange={(v) => set({ weeklyActivity: v as ProfileDraft['weeklyActivity'] })}
        />
        <SingleChoice
          legend="Niveau de condition physique"
          value={draft.fitnessLevel}
          options={toOptions(FITNESS_LEVEL_LABELS)}
          onChange={(v) => set({ fitnessLevel: v as ProfileDraft['fitnessLevel'] })}
        />
      </>
    ),
  },
  {
    title: 'Tes objectifs',
    subtitle: 'Que veux-tu accomplir ? (plusieurs choix possibles)',
    fields: ['goals', 'goalOther'],
    render: (draft, set) => (
      <>
        <MultiChoice
          legend="Objectifs physiques"
          values={draft.goals ?? []}
          options={toOptions(GOAL_LABELS)}
          onChange={(goals) => set({ goals: goals as ProfileDraft['goals'] })}
        />
        {(draft.goals ?? []).includes('autre') && (
          <Field label="Précise ton objectif">
            <Input
              value={draft.goalOther ?? ''}
              onChange={(e) => set({ goalOther: e.target.value })}
              placeholder="Ex : préparer un marathon"
            />
          </Field>
        )}
      </>
    ),
  },
  {
    title: 'Ta santé',
    subtitle: 'Ces informations restent confidentielles.',
    fields: ['medicalConditions', 'allergies', 'medications', 'medicalOther'],
    render: (draft, set) => (
      <>
        <MultiChoice
          legend="Conditions médicales"
          values={draft.medicalConditions ?? []}
          options={toOptions(MEDICAL_CONDITION_LABELS)}
          onChange={(mc) => set({ medicalConditions: mc as ProfileDraft['medicalConditions'] })}
        />
        {(draft.medicalConditions ?? []).includes('allergies') && (
          <Field label="Allergies ou intolérances alimentaires">
            <Input
              value={draft.allergies ?? ''}
              onChange={(e) => set({ allergies: e.target.value })}
              placeholder="Ex : arachides, lactose…"
            />
          </Field>
        )}
        <Field label="Médicaments actuels">
          <Input
            value={draft.medications ?? ''}
            onChange={(e) => set({ medications: e.target.value })}
            placeholder="Ex : aucun, ou liste…"
          />
        </Field>
        {(draft.medicalConditions ?? []).includes('autre') && (
          <Field label="Autre condition (à préciser)">
            <Input
              value={draft.medicalOther ?? ''}
              onChange={(e) => set({ medicalOther: e.target.value })}
            />
          </Field>
        )}
      </>
    ),
  },
  {
    title: 'Ton alimentation',
    subtitle: 'Tes habitudes à table.',
    fields: ['mealFrequency', 'mealFrequencyOther', 'foodChoices', 'foodOther'],
    render: (draft, set) => (
      <>
        <SingleChoice
          legend="Fréquence de repas préférée"
          value={draft.mealFrequency}
          options={toOptions(MEAL_FREQUENCY_LABELS)}
          onChange={(v) => set({ mealFrequency: v as ProfileDraft['mealFrequency'] })}
        />
        {draft.mealFrequency === 'autre' && (
          <Field label="Précise ta fréquence">
            <Input
              value={draft.mealFrequencyOther ?? ''}
              onChange={(e) => set({ mealFrequencyOther: e.target.value })}
            />
          </Field>
        )}
        <MultiChoice
          legend="Choix alimentaires"
          values={draft.foodChoices ?? []}
          options={toOptions(FOOD_CHOICE_LABELS)}
          onChange={(fc) => set({ foodChoices: fc as ProfileDraft['foodChoices'] })}
        />
        {(draft.foodChoices ?? []).includes('autre') && (
          <Field label="Autre choix alimentaire (à préciser)">
            <Input
              value={draft.foodOther ?? ''}
              onChange={(e) => set({ foodOther: e.target.value })}
            />
          </Field>
        )}
      </>
    ),
  },
  {
    title: 'Notes supplémentaires',
    subtitle: 'Tout ce qui te semble pertinent et qu’on n’a pas demandé.',
    fields: ['notes'],
    render: (draft, set) => (
      <Field label="Notes">
        <Textarea
          value={draft.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Ex : je ne mange pas de poisson, je cuisine surtout le week-end…"
          className="min-h-[140px]"
        />
      </Field>
    ),
  },
];

/** Nettoie le brouillon : chaînes vides → null, date vide → null. */
function cleanDraft(draft: ProfileDraft): ProfileDraft {
  const out: ProfileDraft = { ...draft };
  (Object.keys(out) as (keyof ProfileDraft)[]).forEach((key) => {
    const value = out[key];
    if (typeof value === 'string' && value.trim() === '') {
      out[key] = null as never;
    }
  });
  if (!out.birthDate) out.birthDate = null;
  return out;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const saveProfile = useSaveProfile();

  // Pré-remplissage si des infos existent déjà.
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && profile && Object.keys(profile).length > 1) {
    setDraft({
      fullName: profile.fullName ?? undefined,
      birthDate: profile.birthDate?.slice(0, 10),
      sex: profile.sex ?? undefined,
      heightCm: profile.heightCm ?? undefined,
      weightKg: profile.weightKg ?? undefined,
      activityLevel: profile.activityLevel ?? undefined,
      weeklyActivity: profile.weeklyActivity ?? undefined,
      fitnessLevel: profile.fitnessLevel ?? undefined,
      goals: profile.goals ?? [],
      goalOther: profile.goalOther ?? undefined,
      medicalConditions: profile.medicalConditions ?? [],
      allergies: profile.allergies ?? undefined,
      medications: profile.medications ?? undefined,
      medicalOther: profile.medicalOther ?? undefined,
      mealFrequency: profile.mealFrequency ?? undefined,
      mealFrequencyOther: profile.mealFrequencyOther ?? undefined,
      foodChoices: profile.foodChoices ?? [],
      foodOther: profile.foodOther ?? undefined,
      notes: profile.notes ?? undefined,
    });
    setInitialized(true);
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const set = (patch: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...patch }));

  /** Vide les champs de l'étape courante (étape passée). */
  const clearStepFields = () => {
    const cleared: ProfileDraft = { ...draft };
    step.fields.forEach((key) => {
      cleared[key] = (Array.isArray(cleared[key]) ? [] : null) as never;
    });
    setDraft(cleared);
  };

  const goNext = (skipped: boolean) => {
    if (skipped) clearStepFields();
    setError(null);
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    // Dernière étape → enregistrement puis Accueil.
    saveProfile.mutate(cleanDraft(draft), {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (err) =>
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Impossible d’enregistrer ton profil. Réessaie.',
        ),
    });
  };

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / STEPS.length) * 100),
    [stepIndex],
  );

  return (
    <div className="app-container flex min-h-dvh flex-col bg-stone-50">
      {/* Progression */}
      <header className="bg-white px-4 pb-3 pt-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Étape {stepIndex + 1}/{STEPS.length}
          </p>
          <p className="text-xs font-semibold text-brand-600">{progress}%</p>
        </div>
        <div className="mt-2 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={
                i <= stepIndex ? 'h-1.5 flex-1 rounded-full bg-brand-500' : 'h-1.5 flex-1 rounded-full bg-stone-200'
              }
            />
          ))}
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <h1 className="text-xl font-bold text-stone-800">{step.title}</h1>
        <p className="mb-5 mt-1 text-sm text-stone-500">{step.subtitle}</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="space-y-5">{step.render(draft, set)}</div>
      </main>

      {/* Navigation */}
      <footer className="border-t border-stone-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          )}
          <button
            type="button"
            onClick={() => goNext(true)}
            disabled={saveProfile.isPending}
            className="btn-ghost flex-1 py-2.5 text-sm text-stone-500 disabled:opacity-50"
          >
            Passer
          </button>
          <Button onClick={() => goNext(false)} loading={saveProfile.isPending}>
            {isLast ? (
              'Terminer'
            ) : (
              <>
                Continuer
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        {isLast && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-stone-400">
            <Check className="h-3.5 w-3.5" /> Tes données restent modifiables dans ton profil.
          </p>
        )}
      </footer>
    </div>
  );
}
