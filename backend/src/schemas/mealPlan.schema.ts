import { z } from 'zod';

export const mealPlanStatusEnum = z.enum(['a_faire', 'en_preparation', 'prepare']);

export const createMealPlanSchema = z.object({
  mealId: z.string().min(1),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  servings: z.number().int().min(1).max(10).optional().default(2),
  status: mealPlanStatusEnum.optional().default('a_faire'),
});
export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;

export const updateMealPlanSchema = z.object({
  mealId: z.string().min(1).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  servings: z.number().int().min(1).max(10).optional(),
  status: mealPlanStatusEnum.optional(),
});
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;

export const updateStatusSchema = z.object({
  status: mealPlanStatusEnum,
});
