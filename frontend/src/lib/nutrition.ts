// ── Calcul des objectifs nutritionnels quotidiens (côté client) ──
// Miroir de backend/src/lib/nutrition.ts — affichage réactif dans le
// profil. Le backend reste la source de vérité (valeurs persistées).

import type { IngredientNutrition, Nutrition } from '../types';

export const NUTRITION_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;
export type NutritionKey = (typeof NUTRITION_KEYS)[number];

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

// ── Apports d'un plat calculés depuis ses ingrédients ────────
// Miroir de computePerPortionNutrition (backend/src/controllers/meals.controller.ts).

/** Apports d'un ingrédient ramenés à sa quantité actuelle (vide si non renseignés). */
export function ingredientContribution(ing: {
  quantity?: number;
  nutrition?: IngredientNutrition | null;
}): Partial<Record<NutritionKey, number>> {
  const n = ing.nutrition;
  if (!n) return {};
  const qty = Number.isFinite(ing.quantity) ? (ing.quantity as number) : 0;
  const ref = Number.isFinite(n.quantity) && (n.quantity as number) > 0 ? (n.quantity as number) : qty;
  if (ref <= 0 || qty <= 0) return {};
  const factor = qty / ref;
  const out: Partial<Record<NutritionKey, number>> = {};
  for (const key of NUTRITION_KEYS) {
    const v = n[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v * factor;
  }
  return out;
}

/** Apports par portion d'un plat : somme des contributions ÷ portions (null si aucune donnée). */
export function computeMealNutrition(
  ingredients: { quantity?: number; nutrition?: IngredientNutrition | null }[],
  servings?: number | null,
): Nutrition | null {
  const totals: Partial<Record<NutritionKey, number>> = {};
  for (const ing of ingredients) {
    for (const [key, value] of Object.entries(ingredientContribution(ing)) as [NutritionKey, number][]) {
      totals[key] = (totals[key] ?? 0) + value;
    }
  }
  const used = NUTRITION_KEYS.filter((key) => totals[key] !== undefined);
  if (used.length === 0) return null;
  const portions = servings && servings > 0 ? servings : 1;
  const result: Nutrition = {};
  for (const key of used) {
    const total = totals[key] as number;
    result[key] = key === 'calories' ? Math.round(total / portions) : Math.round((total / portions) * 10) / 10;
  }
  return result;
}

/** Nettoie la nutrition importée (JSON/IA) et fixe la quantité de référence des apports. */
export function parseIngredientNutrition(raw: unknown, fallbackQty?: number): IngredientNutrition | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const nutrition: Partial<Record<NutritionKey, number>> = {};
  for (const key of NUTRITION_KEYS) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) nutrition[key] = v;
  }
  if (!NUTRITION_KEYS.some((key) => nutrition[key] !== undefined)) return undefined;
  const result: IngredientNutrition = { ...nutrition };
  const ref = obj.quantity;
  if (typeof ref === 'number' && Number.isFinite(ref) && ref > 0) result.quantity = ref;
  else if (fallbackQty !== undefined && Number.isFinite(fallbackQty) && fallbackQty > 0) result.quantity = fallbackQty;
  return result;
}

/** true si la nutrition contient au moins une valeur exploitable. */
export function hasNutritionValues(n?: IngredientNutrition | null): boolean {
  return Boolean(n && NUTRITION_KEYS.some((key) => n[key] !== undefined));
}
