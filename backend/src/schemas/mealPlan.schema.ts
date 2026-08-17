import { z } from 'zod';

export const mealPlanStatusEnum = z.enum(['a_faire', 'en_preparation', 'prepare']);

/**
 * Sélection d'ingrédients faite par l'utilisateur dans la modale de
 * planification (étape 2). `quantity` est la quantité FINALE (déjà mise à
 * l'échelle/ajustée côté client) — aucun re-scaling serveur.
 * Absent (`undefined`) = tous les ingrédients du plat (comportement historique).
 */
export const ingredientSelectionSchema = z.array(
  z.object({
    id: z.string().min(1),
    quantity: z.number().positive().max(100000),
  }),
).max(100);
export type IngredientSelection = z.infer<typeof ingredientSelectionSchema>;

export const createMealPlanSchema = z.object({
  mealId: z.string().min(1),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  servings: z.number().int().min(1).max(10).optional().default(2),
  status: mealPlanStatusEnum.optional().default('a_faire'),
  ingredients: ingredientSelectionSchema.optional(),
});
export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;

export const updateMealPlanSchema = z.object({
  mealId: z.string().min(1).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  servings: z.number().int().min(1).max(10).optional(),
  status: mealPlanStatusEnum.optional(),
  ingredients: ingredientSelectionSchema.optional(),
});
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;

export const updateStatusSchema = z.object({
  status: mealPlanStatusEnum,
});

/**
 * PATCH /api/meal-plans/:id/steps — étapes de préparation cochées.
 * `completedSteps` est la valeur FINALE (liste absolue de numéros d'étapes),
 * ce qui rend l'appel idempotent (même pattern que grocery check offline).
 * Le statut du plan est dérivé côté serveur depuis ce tableau.
 */
export const updateStepsSchema = z.object({
  completedSteps: z.array(z.number().int().min(1)).max(100),
});
