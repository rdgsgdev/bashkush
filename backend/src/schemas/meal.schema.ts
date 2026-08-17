import { z } from 'zod';

// ── Validations partagées ────────────────────────────────────

export const difficultyEnum = z.enum(['facile', 'moyen', 'difficile']);
// Type de plat (nature de la recette — PAS le moment du repas, qui est
// porté par MealPlan.mealType).
export const categoryEnum = z.enum([
  'bowl',
  'wrap',
  'salad',
  'soup',
  'sandwich',
  'pasta',
  'stir_fry',
  'dessert',
  'smoothie',
  'snack_food',
  'side',
  'main',
  'beverage',
]);

// Rayons par défaut (les rayons personnalisés sont aussi autorisés : on accepte toute string).
export const aisleName = z.string().min(1).max(60);

export const nutritionSchema = z
  .object({
    calories: z.number().nonnegative().optional(),
    protein: z.number().nonnegative().optional(),
    carbs: z.number().nonnegative().optional(),
    fat: z.number().nonnegative().optional(),
    fiber: z.number().nonnegative().optional(),
  })
  .partial();

// Apports portés par un ingrédient : valeurs données pour `quantity` unités
// (défaut : la quantité de l'ingrédient). Sert à recalculer les apports par
// portion du plat quand les quantités évoluent.
export const ingredientNutritionSchema = nutritionSchema.extend({
  quantity: z.number().positive().optional(),
});

export const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number(),
  unit: z.string().min(1),
  aisle: aisleName,
  optional: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
  nutrition: ingredientNutritionSchema.optional().nullable(),
});

export const stepSchema = z.object({
  stepNumber: z.number().int(),
  instruction: z.string().min(1),
  time: z.number().int().nonnegative().optional().nullable(),
  ingredients: z.array(z.string()).optional().nullable(),
});

// ── Schéma d'un repas complet (création / import JSON) ──────
// L'id est requis par le schéma JSON mais, pour les repas créés
// manuellement sans id, on en génère un côté contrôleur.
export const createMealSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  servings: z.number().int().min(1).max(50).optional().default(2),
  prepTime: z.number().int().nonnegative().optional().nullable(),
  cookTime: z.number().int().nonnegative().optional().nullable(),
  totalTime: z.number().int().nonnegative().optional().nullable(),
  difficulty: difficultyEnum.optional().nullable(),
  category: categoryEnum.optional().nullable(),
  nutrition: nutritionSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema).optional().default([]),
});
export type CreateMealInput = z.infer<typeof createMealSchema>;

// ── Schéma de mise à jour (tous les champs optionnels) ──────
export const updateMealSchema = createMealSchema.partial();
export type UpdateMealInput = z.infer<typeof updateMealSchema>;

// Body optionnel de PATCH /meals/:id/favorite — valeur absolue pour un rejeu
// offline déterministe (sans body → bascule, comportement historique conservé).
export const favoriteSchema = z.object({
  isFavorite: z.boolean().optional(),
});
