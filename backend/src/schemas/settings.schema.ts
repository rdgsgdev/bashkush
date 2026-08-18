import { z } from 'zod';
import { LIST_KEYS } from '../lib/listOptions';

// ── Réglages IA de la famille ────────────────────────────────

export const updateSettingsSchema = z.object({
  aiMealGenerationEnabled: z.boolean().optional(),
  aiNutritionEnabled: z.boolean().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// ── Listes paramétrables ─────────────────────────────────────

/** Param :listKey des routes /settings/lists/:listKey. */
export const listKeySchema = z.enum(LIST_KEYS);

/** POST /settings/lists/:listKey — le value est dérivé du label côté serveur. */
export const createListOptionSchema = z.object({
  label: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * PUT /settings/lists/:listKey/:id — `label` uniquement (le `value` est la clé
 * technique référencée par les données existantes : immuable, sauf pour les
 * unités où value = label).
 */
export const updateListOptionSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/** Body de PUT /settings/lists/:listKey/reorder — ordre absolu idempotent. */
export const reorderListOptionsSchema = z.object({
  order: z
    .array(
      z.object({
        id: z.string().min(1),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});
