// ── Calcul des objectifs nutritionnels quotidiens ────────────
// Basé sur la formule Mifflin-St Jeor (métabolisme de base),
// multipliée par un facteur d'activité, ajustée selon l'objectif.

import type { Profile } from '@prisma/client';

/** Facteurs d'activité (multiplicateurs TDEE). */
const ACTIVITY_FACTORS: Record<string, number> = {
  sedentaire: 1.2,
  legerement_actif: 1.375,
  moderement_actif: 1.55,
  tres_actif: 1.725,
  extremement_actif: 1.9,
};

/** Ajustement calorique selon l'objectif prioritaire (kcal/jour). */
const GOAL_CALORIE_ADJUST: Record<string, number> = {
  perdre_poids: -500, // ~ -0,5 kg/semaine
  maintenir_poids: 0,
  prendre_poids: 500, // ~ +0,5 kg/semaine
  masse_musculaire: 300, // léger surplus
  condition_physique: 0,
};

/** Apport protéique recommandé (g/kg de poids corporel) selon l'objectif. */
const GOAL_PROTEIN_PER_KG: Record<string, number> = {
  perdre_poids: 1.8, // préserver la masse musculaire en déficit
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

function computeAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

/** Objectif prioritaire = première valeur de `goals` connue pour l'ajustement. */
function primaryGoal(goals: string[] | null | undefined): string | null {
  if (!goals) return null;
  const known = goals.find((g) => GOAL_CALORIE_ADJUST[g] !== undefined && g !== 'autre');
  return known ?? null;
}

/**
 * Calcule les calories et protéines quotidiennes visées.
 * Retourne null s'il manque une donnée indispensable
 * (taille, poids, date de naissance ou niveau d'activité).
 */
export function computeDailyTargets(profile: Profile): DailyTargets | null {
  const { heightCm, weightKg, birthDate, sex, activityLevel, goals } = profile;
  if (!heightCm || !weightKg || !birthDate || !activityLevel) return null;

  const age = computeAge(birthDate);
  if (age < 10 || age > 110) return null;

  const factor = ACTIVITY_FACTORS[activityLevel];
  if (!factor) return null;

  // Métabolisme de base — Mifflin-St Jeor.
  // Pour « autre / non précisé », on prend la moyenne homme/femme.
  const sexOffset = sex === 'homme' ? 5 : sex === 'femme' ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;

  const goal = primaryGoal(goals);
  const calorieAdjust = goal ? GOAL_CALORIE_ADJUST[goal] : 0;

  // Plancher de sécurité : ne jamais descendre sous 1200 kcal/jour.
  const dailyCalories = Math.max(1200, Math.round((bmr * factor + calorieAdjust) / 10) * 10);

  const proteinPerKg = (goal && GOAL_PROTEIN_PER_KG[goal]) || DEFAULT_PROTEIN_PER_KG;
  const dailyProtein = Math.round((weightKg * proteinPerKg) / 5) * 5;

  return { dailyCalories, dailyProtein };
}
