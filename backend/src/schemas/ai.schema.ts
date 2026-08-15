// ── Génération de plats par IA (Perplexity) ──────────────────

import { z } from 'zod';
import { difficultyEnum, categoryEnum, createMealSchema } from './meal.schema';

/**
 * Corps attendu par POST /api/ai/generate-meal.
 * - Première génération : memberIds + paramètres du formulaire.
 * - Régénération via chat : on renvoie le plat précédent
 *   (previousMeal) et la consigne de modification (feedback).
 */
export const generateMealRequestSchema = z.object({
  // userId des profils (membres de la famille) à prendre en compte.
  memberIds: z.array(z.string().min(1)).min(1, 'Sélectionne au moins un membre'),
  servings: z.number().int().min(1).max(50),
  difficulty: difficultyEnum.optional().nullable(),
  category: categoryEnum.optional().nullable(),
  // Ingrédients souhaités dans le plat (libres, max 20).
  desiredIngredients: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  // Description libre pour guider l'IA.
  description: z.string().trim().max(1000).optional().nullable(),
  // Plat précédemment généré (régénération).
  previousMeal: createMealSchema.optional(),
  // Instruction de modification fournie via le chat.
  feedback: z.string().trim().min(1).max(1000).optional(),
});
export type GenerateMealRequest = z.infer<typeof generateMealRequestSchema>;
