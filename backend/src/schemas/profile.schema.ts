import { z } from 'zod';

// ── Énumérations du profil ─────────────────────────────────────

const sexEnum = z.enum(['homme', 'femme']);

const activityLevelEnum = z.enum([
  'sedentaire',
  'legerement_actif',
  'moderement_actif',
  'tres_actif',
  'extremement_actif',
]);

const weeklyActivityEnum = z.enum(['moins_1h', '1_3h', '3_5h', '5_7h', 'plus_7h']);

const fitnessLevelEnum = z.enum(['debutant', 'intermediaire', 'avance']);

const goalsEnum = z.array(
  z.enum([
    'perdre_poids',
    'maintenir_poids',
    'prendre_poids',
    'masse_musculaire',
    'condition_physique',
    'autre',
  ]),
);

const medicalConditionsEnum = z.array(
  z.enum(['diabete', 'hypertension', 'cholesterol', 'allergies', 'autre']),
);

const mealFrequencyEnum = z.enum(['3_repas', '4_6_repas', 'jeune_intermittent', 'autre']);

const foodChoicesEnum = z.array(
  z.enum([
    'fruits',
    'legumes',
    'cereales_completes',
    'proteines_maigres',
    'produits_laitiers',
    'noix_graines',
    'legumineuses',
    'autre',
  ]),
);

// ── Schéma de mise à jour ──────────────────────────────────────
// Tous les champs sont optionnels (étapes skippées → null).

const optionalText = z.string().trim().max(1000).optional().nullable();

export const saveProfileSchema = z.object({
  fullName: optionalText,
  birthDate: z.coerce.date().optional().nullable(),
  sex: sexEnum.optional().nullable(),
  heightCm: z.number().min(50).max(300).optional().nullable(),
  weightKg: z.number().min(20).max(500).optional().nullable(),
  activityLevel: activityLevelEnum.optional().nullable(),
  weeklyActivity: weeklyActivityEnum.optional().nullable(),
  fitnessLevel: fitnessLevelEnum.optional().nullable(),
  goals: goalsEnum.optional(),
  goalOther: optionalText,
  medicalConditions: medicalConditionsEnum.optional(),
  allergies: optionalText,
  medications: optionalText,
  medicalOther: optionalText,
  mealFrequency: mealFrequencyEnum.optional().nullable(),
  mealFrequencyOther: optionalText,
  foodChoices: foodChoicesEnum.optional(),
  foodOther: optionalText,
  notes: optionalText,
  // Objectifs quotidiens saisis manuellement (absents → mode auto).
  dailyCalories: z.number().int().min(800).max(15000).optional().nullable(),
  dailyProtein: z.number().int().min(20).max(500).optional().nullable(),
  // true → écrase les valeurs manuelles et recalcule depuis le profil.
  syncTargets: z.boolean().optional(),
});

export type SaveProfileInput = z.infer<typeof saveProfileSchema>;
