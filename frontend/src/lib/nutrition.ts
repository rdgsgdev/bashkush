// ── Calcul des objectifs nutritionnels quotidiens (côté client) ──
// Miroir de backend/src/lib/nutrition.ts — affichage réactif dans le
// profil. Le backend reste la source de vérité (valeurs persistées).

export interface NutritionInput {
  heightCm?: number | null;
  weightKg?: number | null;
  birthDate?: string | null;
  sex?: string | null;
  activityLevel?: string | null;
  goals?: string[] | null;
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentaire: 1.2,
  legerement_actif: 1.375,
  moderement_actif: 1.55,
  tres_actif: 1.725,
  extremement_actif: 1.9,
};

const GOAL_CALORIE_ADJUST: Record<string, number> = {
  perdre_poids: -500,
  maintenir_poids: 0,
  prendre_poids: 500,
  masse_musculaire: 300,
  condition_physique: 0,
};

const GOAL_PROTEIN_PER_KG: Record<string, number> = {
  perdre_poids: 1.8,
  maintenir_poids: 1.4,
  prendre_poids: 1.8,
  masse_musculaire: 1.8,
  condition_physique: 1.6,
};

const DEFAULT_PROTEIN_PER_KG = 1.4;

export interface DailyTargets {
  dailyCalories: number;
  dailyProtein: number;
}

/**
 * Calcule les calories et protéines quotidiennes visées (Mifflin-St Jeor).
 * Retourne null s'il manque une donnée indispensable.
 */
export function computeDailyTargets(input: NutritionInput): DailyTargets | null {
  const { heightCm, weightKg, birthDate, sex, activityLevel, goals } = input;
  if (!heightCm || !weightKg || !birthDate || !activityLevel) return null;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  if (age < 10 || age > 110) return null;

  const factor = ACTIVITY_FACTORS[activityLevel];
  if (!factor) return null;

  const sexOffset = sex === 'homme' ? 5 : sex === 'femme' ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;

  const goal = (goals ?? []).find((g) => GOAL_CALORIE_ADJUST[g] !== undefined && g !== 'autre') ?? null;
  const calorieAdjust = goal ? GOAL_CALORIE_ADJUST[goal] : 0;

  const dailyCalories = Math.max(1200, Math.round((bmr * factor + calorieAdjust) / 10) * 10);
  const proteinPerKg = (goal && GOAL_PROTEIN_PER_KG[goal]) || DEFAULT_PROTEIN_PER_KG;
  const dailyProtein = Math.round((weightKg * proteinPerKg) / 5) * 5;

  return { dailyCalories, dailyProtein };
}
