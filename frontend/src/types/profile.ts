// ── Profil utilisateur (miroir du modèle Prisma Profile) ─────

export type Sex = 'homme' | 'femme' | 'autre' | 'non_precise';
export type ActivityLevel =
  | 'sedentaire'
  | 'legerement_actif'
  | 'moderement_actif'
  | 'tres_actif'
  | 'extremement_actif';
export type WeeklyActivity = 'moins_1h' | '1_3h' | '3_5h' | '5_7h' | 'plus_7h';
export type FitnessLevel = 'debutant' | 'intermediaire' | 'avance';
export type Goal =
  | 'perdre_poids'
  | 'maintenir_poids'
  | 'prendre_poids'
  | 'masse_musculaire'
  | 'condition_physique'
  | 'autre';
export type MedicalCondition = 'diabete' | 'hypertension' | 'cholesterol' | 'allergies' | 'autre';
export type MealFrequency = '3_repas' | '4_6_repas' | 'jeune_intermittent' | 'autre';
export type FoodChoice =
  | 'fruits'
  | 'legumes'
  | 'cereales_completes'
  | 'proteines_maigres'
  | 'produits_laitiers'
  | 'noix_graines'
  | 'legumineuses'
  | 'autre';

export interface Profile {
  userId: string;
  fullName?: string | null;
  birthDate?: string | null;
  sex?: Sex | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  weeklyActivity?: WeeklyActivity | null;
  fitnessLevel?: FitnessLevel | null;
  goals?: Goal[];
  goalOther?: string | null;
  medicalConditions?: MedicalCondition[];
  allergies?: string | null;
  medications?: string | null;
  medicalOther?: string | null;
  mealFrequency?: MealFrequency | null;
  mealFrequencyOther?: string | null;
  foodChoices?: FoodChoice[];
  foodOther?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  onboardedAt?: string | null;
}

/** Brouillon éditable (onboarding / page profil) — tout optionnel. */
export type ProfileDraft = Partial<Omit<Profile, 'userId' | 'onboardedAt' | 'photoUrl'>>;

// ── Libellés FR ──────────────────────────────────────────────

export const SEX_LABELS: Record<Sex, string> = {
  homme: 'Homme',
  femme: 'Femme',
  autre: 'Autre',
  non_precise: 'Préfère ne pas dire',
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentaire: 'Sédentaire — peu ou pas d’exercice',
  legerement_actif: 'Légèrement actif — sport 1 à 3 jours/semaine',
  moderement_actif: 'Modérément actif — sport 3 à 5 jours/semaine',
  tres_actif: 'Très actif — sport 6 à 7 jours/semaine',
  extremement_actif: 'Extrêmement actif — travail physique ou 2 entraînements/jour',
};

export const WEEKLY_ACTIVITY_LABELS: Record<WeeklyActivity, string> = {
  moins_1h: 'Moins d’1 heure par semaine',
  '1_3h': '1 à 3 heures par semaine',
  '3_5h': '3 à 5 heures par semaine',
  '5_7h': '5 à 7 heures par semaine',
  plus_7h: 'Plus de 7 heures par semaine',
};

export const FITNESS_LEVEL_LABELS: Record<FitnessLevel, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export const GOAL_LABELS: Record<Goal, string> = {
  perdre_poids: 'Perdre du poids',
  maintenir_poids: 'Maintenir le poids',
  prendre_poids: 'Prendre du poids',
  masse_musculaire: 'Développer la masse musculaire',
  condition_physique: 'Améliorer la condition physique globale',
  autre: 'Autre (à préciser)',
};

export const MEDICAL_CONDITION_LABELS: Record<MedicalCondition, string> = {
  diabete: 'Diabète',
  hypertension: 'Hypertension',
  cholesterol: 'Cholestérol élevé',
  allergies: 'Allergies',
  autre: 'Autre (à préciser)',
};

export const MEAL_FREQUENCY_LABELS: Record<MealFrequency, string> = {
  '3_repas': '3 repas par jour',
  '4_6_repas': '4 à 6 petits repas/collations par jour',
  jeune_intermittent: 'Jeûne intermittent',
  autre: 'Autre (à préciser)',
};

export const FOOD_CHOICE_LABELS: Record<FoodChoice, string> = {
  fruits: 'Fruits',
  legumes: 'Légumes',
  cereales_completes: 'Céréales complètes',
  proteines_maigres: 'Protéines maigres',
  produits_laitiers: 'Produits laitiers',
  noix_graines: 'Noix et graines',
  legumineuses: 'Légumineuses',
  autre: 'Autre (à préciser)',
};

/** Âge calculé à partir de la date de naissance (ou null). */
export function computeAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}
