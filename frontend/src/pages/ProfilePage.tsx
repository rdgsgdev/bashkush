import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, Flame, Beef, Save } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/FormControl';
import { SingleChoice, MultiChoice, type ChoiceOption } from '../components/onboarding/Choice';
import { useProfile, useSaveProfile, useUploadProfileImage } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import type { ProfileDraft } from '../types/profile';
import {
  computeAge,
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-700">{title}</h2>
      {children}
    </section>
  );
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();
  const saveProfile = useSaveProfile();
  const uploadImage = useUploadProfileImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ProfileDraft>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Charge le profil dans le brouillon une fois disponible.
  useEffect(() => {
    if (!profile || initialized) return;
    setDraft({
      fullName: profile.fullName ?? '',
      birthDate: profile.birthDate?.slice(0, 10) ?? '',
      sex: profile.sex ?? null,
      heightCm: profile.heightCm ?? null,
      weightKg: profile.weightKg ?? null,
      activityLevel: profile.activityLevel ?? null,
      weeklyActivity: profile.weeklyActivity ?? null,
      fitnessLevel: profile.fitnessLevel ?? null,
      goals: profile.goals ?? [],
      goalOther: profile.goalOther ?? '',
      medicalConditions: profile.medicalConditions ?? [],
      allergies: profile.allergies ?? '',
      medications: profile.medications ?? '',
      medicalOther: profile.medicalOther ?? '',
      mealFrequency: profile.mealFrequency ?? null,
      mealFrequencyOther: profile.mealFrequencyOther ?? '',
      foodChoices: profile.foodChoices ?? [],
      foodOther: profile.foodOther ?? '',
      notes: profile.notes ?? '',
    });
    setInitialized(true);
  }, [profile, initialized]);

  const set = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    // Chaînes vides → null pour ne pas stocker des "".
    const cleaned = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
    ) as ProfileDraft;
    saveProfile.mutate(cleaned, {
      onSuccess: () => setSaved(true),
      onError: (err) =>
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Impossible d’enregistrer le profil.',
        ),
    });
  };

  const handlePhoto = (file: File) => {
    setError(null);
    uploadImage.mutate(file, {
      onError: (err) =>
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Impossible de téléverser la photo.',
        ),
    });
  };

  const age = computeAge(draft.birthDate);
  const saving = saveProfile.isPending || uploadImage.isPending;

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Mon profil" subtitle={draft.fullName || user?.email} />

      <main className="flex-1 overflow-y-auto bg-stone-50 px-4 py-5 pb-6">
        {/* Objectifs quotidiens calculés */}
        <section className="card mb-4 bg-brand-500 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white/80">
            Objectifs quotidiens
          </h2>
          {profile?.dailyCalories && profile?.dailyProtein ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <Flame className="h-7 w-7 shrink-0 text-orange-300" />
                <div>
                  <p className="text-xl font-bold leading-tight">
                    {profile.dailyCalories.toLocaleString('fr-CA')}
                  </p>
                  <p className="text-xs text-white/80">kcal / jour</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <Beef className="h-7 w-7 shrink-0 text-orange-300" />
                <div>
                  <p className="text-xl font-bold leading-tight">{profile.dailyProtein} g</p>
                  <p className="text-xs text-white/80">protéines / jour</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/85">
              Renseigne ta taille, ton poids, ta date de naissance et ton niveau d’activité puis
              enregistre pour obtenir tes objectifs caloriques et protéiques.
            </p>
          )}
          <p className="mt-3 text-[11px] text-white/70">
            Calculé selon ta taille, poids, âge, sexe, activité et objectifs (Mifflin-St Jeor).
          </p>
        </section>

      {/* Photo + identité */}
      <Section title="Identité">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="Photo de profil"
                className="h-20 w-20 rounded-full border-2 border-brand-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
                {(draft.fullName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition active:scale-95 disabled:opacity-50"
              aria-label="Changer la photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(file);
                e.target.value = '';
              }}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Field label="Nom complet">
              <Input
                value={draft.fullName ?? ''}
                onChange={(e) => set({ fullName: e.target.value })}
                placeholder="Ton nom"
              />
            </Field>
            <p className="truncate text-xs text-stone-400">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de naissance">
            <Input
              type="date"
              value={draft.birthDate ?? ''}
              onChange={(e) => set({ birthDate: e.target.value })}
            />
          </Field>
          <Field label="Âge">
            <Input value={age !== null ? `${age} ans` : ''} readOnly placeholder="—" />
          </Field>
        </div>
        <SingleChoice
          legend="Sexe"
          value={draft.sex}
          options={toOptions(SEX_LABELS)}
          onChange={(v) => set({ sex: v as ProfileDraft['sex'] })}
        />
      </Section>

      {/* Mesures */}
      <div className="mt-4">
        <Section title="Mesures">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Taille (cm)">
              <Input
                type="number"
                inputMode="numeric"
                value={draft.heightCm ?? ''}
                onChange={(e) => set({ heightCm: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </Field>
            <Field label="Poids (kg)">
              <Input
                type="number"
                inputMode="decimal"
                value={draft.weightKg ?? ''}
                onChange={(e) => set({ weightKg: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Activité */}
      <div className="mt-4">
        <Section title="Activité & forme">
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
        </Section>
      </div>

      {/* Objectifs */}
      <div className="mt-4">
        <Section title="Objectifs">
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
              />
            </Field>
          )}
        </Section>
      </div>

      {/* Santé */}
      <div className="mt-4">
        <Section title="Santé">
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
              />
            </Field>
          )}
          <Field label="Médicaments actuels">
            <Input
              value={draft.medications ?? ''}
              onChange={(e) => set({ medications: e.target.value })}
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
        </Section>
      </div>

      {/* Alimentation */}
      <div className="mt-4">
        <Section title="Alimentation">
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
              <Input value={draft.foodOther ?? ''} onChange={(e) => set({ foodOther: e.target.value })} />
            </Field>
          )}
        </Section>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <Section title="Notes supplémentaires">
          <Field label="Notes">
            <Textarea
              value={draft.notes ?? ''}
              onChange={(e) => set({ notes: e.target.value })}
              className="min-h-[100px]"
              placeholder="Informations ou préférences supplémentaires…"
            />
          </Field>
        </Section>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {saved && (
        <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Profil enregistré ✓
        </div>
      )}

      <div className="mt-4 pb-6">
        <Button onClick={handleSave} loading={saveProfile.isPending} className="w-full">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
      </main>
    </div>
  );
}
