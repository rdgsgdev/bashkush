import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, Flame, Beef, RefreshCw, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/FormControl';
import { SingleChoice, MultiChoice, type ChoiceOption } from '../components/onboarding/Choice';
import { FamilySection } from '../components/profile/FamilySection';
import { useProfile, useSaveProfile, useUploadProfileImage } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { useConnection } from '../hooks/useConnection';
import { computeDailyTargets } from '../lib/nutrition';
import type { ProfileDraft } from '../types/profile';
import type { ProfileResponse } from '../api/profile';
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

  // L'upload de photo passe par Supabase Storage : connexion requise.
  const { status } = useConnection();
  const offline = status !== 'online';

  const [draft, setDraft] = useState<ProfileDraft>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false); // image absente du cache offline

  // Charge le profil dans le brouillon une fois disponible.
  useEffect(() => {
    if (!profile || initialized) return;
    setDraft({
      fullName: profile.fullName ?? '',
      birthDate: profile.birthDate?.slice(0, 10) ?? '',
      // Les anciennes valeurs (autre / non_precise) ne sont plus proposées → null.
      sex: profile.sex === 'homme' || profile.sex === 'femme' ? profile.sex : null,
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
      dailyCalories: profile.dailyCalories ?? null,
      dailyProtein: profile.dailyProtein ?? null,
    });
    setInitialized(true);
  }, [profile, initialized]);

  const set = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  /** Chaînes vides → null pour ne pas stocker des "". */
  const cleanDraft = (): ProfileDraft =>
    Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
    ) as ProfileDraft;

  const onSaveSuccess = (savedProfile: ProfileResponse) => {
    setSaved(true);
    // Resynchronise les objectifs du brouillon avec la réponse
    // (recalcul auto côté serveur après un changement de poids/objectif…).
    // Hors ligne : réponse synthétique = brouillon fusionné (objectifs inchangés).
    setDraft((d) => ({
      ...d,
      dailyCalories: savedProfile.dailyCalories ?? null,
      dailyProtein: savedProfile.dailyProtein ?? null,
    }));
  };

  const onSaveError = (err: unknown) =>
    setError(
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Impossible d’enregistrer le profil.',
    );

  const handleSave = () => {
    setError(null);
    const cleaned = cleanDraft();
    // On n'envoie les objectifs que s'ils ont été modifiés à la main
    // (sinon le serveur reste en mode calcul automatique).
    const targetsTouched =
      draft.dailyCalories !== (profile?.dailyCalories ?? null) ||
      draft.dailyProtein !== (profile?.dailyProtein ?? null);
    if (!targetsTouched) {
      delete cleaned.dailyCalories;
      delete cleaned.dailyProtein;
    }
    saveProfile.mutate(cleaned, { onSuccess: onSaveSuccess, onError: onSaveError });
  };

  /** Écrase les valeurs manuelles : recalcul depuis les infos du profil. */
  const handleSync = () => {
    setError(null);
    saveProfile.mutate(
      { ...cleanDraft(), syncTargets: true },
      { onSuccess: onSaveSuccess, onError: onSaveError },
    );
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

  // Objectifs recalculés en direct à partir du brouillon (réactifs dès
  // qu'une donnée change) — le serveur reste la valeur enregistrée.
  // Fallback vers le profil seulement tant que le brouillon n'est pas
  // initialisé (sinon un champ effacé serait remplacé par l'ancienne valeur).
  const liveTargets = computeDailyTargets({
    heightCm: draft.heightCm === undefined ? profile?.heightCm ?? null : draft.heightCm,
    weightKg: draft.weightKg === undefined ? profile?.weightKg ?? null : draft.weightKg,
    birthDate: draft.birthDate === undefined ? profile?.birthDate ?? null : draft.birthDate,
    sex: draft.sex === undefined ? profile?.sex ?? null : draft.sex,
    activityLevel:
      draft.activityLevel === undefined ? profile?.activityLevel ?? null : draft.activityLevel,
    goals: draft.goals ?? profile?.goals ?? [],
  });

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Mon profil" subtitle={draft.fullName || user?.email} />

      <main className="flex-1 overflow-y-auto bg-stone-50 px-4 py-5 pb-6">
        {/* Objectifs quotidiens — éditables, icône ↻ pour recalculer */}
        <section className="card mb-4 bg-brand-500 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wide text-white/80">
              Objectifs quotidiens
            </h2>
            <button
              type="button"
              onClick={handleSync}
              disabled={saving}
              title="Recalculer selon mes informations"
              aria-label="Recalculer les objectifs"
              className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', saveProfile.isPending && 'animate-spin')} />
            </button>
          </div>
          {liveTargets || draft.dailyCalories || draft.dailyProtein ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                  <Flame className="h-6 w-6 shrink-0 text-orange-300" />
                  <div className="min-w-0 flex-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={draft.dailyCalories ?? ''}
                      onChange={(e) =>
                        set({ dailyCalories: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      placeholder={liveTargets ? String(liveTargets.dailyCalories) : '—'}
                      className="!border-transparent !bg-white/10 text-base !font-bold text-white placeholder:text-white/40"
                    />
                    <p className="mt-0.5 text-xs text-white/80">kcal / jour</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                  <Beef className="h-6 w-6 shrink-0 text-orange-300" />
                  <div className="min-w-0 flex-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={draft.dailyProtein ?? ''}
                      onChange={(e) =>
                        set({ dailyProtein: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      placeholder={liveTargets ? String(liveTargets.dailyProtein) : '—'}
                      className="!border-transparent !bg-white/10 text-base !font-bold text-white placeholder:text-white/40"
                    />
                    <p className="mt-0.5 text-xs text-white/80">g protéines / jour</p>
                  </div>
                </div>
              </div>
              {profile?.targetsManual ? (
                <p className="mt-2 text-xs font-semibold text-orange-200">
                  Valeurs personnalisées — ↻ pour recalculer selon tes informations.
                </p>
              ) : (
                <p className="mt-2 text-xs text-white/70">
                  Valeurs calculées automatiquement — modifiables (↻ pour revenir au calcul).
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-white/85">
              Renseigne ta taille, ton poids, ta date de naissance et ton niveau d’activité puis
              enregistre pour obtenir tes objectifs caloriques et protéiques.
            </p>
          )}
          <p className="mt-3 text-[11px] text-white/70">
            Calcul selon ta taille, poids, âge, sexe, activité et objectifs (Mifflin-St Jeor).
          </p>
        </section>

      {/* Photo + identité */}
      <Section title="Identité">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.photoUrl && !photoFailed ? (
              <img
                src={profile.photoUrl}
                alt="Photo de profil"
                onError={() => setPhotoFailed(true)}
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
              disabled={saving || offline}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition active:scale-95 disabled:opacity-50"
              aria-label="Changer la photo"
              title={offline ? 'Connexion requise pour changer la photo' : 'Changer la photo'}
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
        {/* Empilés sur mobile : l'input date iOS déborde de sa cellule de grille
            et chevauche le champ voisin. min-w-0 autorise aussi le rétrécissement
            des cellules sur les écrans plus larges. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date de naissance" className="min-w-0">
            <Input
              type="date"
              value={draft.birthDate ?? ''}
              onChange={(e) => set({ birthDate: e.target.value })}
            />
          </Field>
          <Field label="Âge" className="min-w-0">
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

      {/* Ma famille — vue / ajout par courriel / retrait */}
      <div className="mt-4">
        <Section title="Ma famille">
          <FamilySection />
        </Section>
      </div>

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
      </main>

      {/* Barre d'action fixe en bas (même pattern que les footers de modales) —
          reste visible pendant le défilement. */}
      <footer className="sticky bottom-0 z-30 border-t border-stone-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button onClick={handleSave} loading={saveProfile.isPending} className="w-full">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </footer>
    </div>
  );
}
