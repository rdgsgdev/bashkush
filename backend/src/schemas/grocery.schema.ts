import { z } from 'zod';

export const createGroceryItemSchema = z.object({
  // Id optionnel généré par le client : rend le rejeu de la file offline idempotent.
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().optional().default(1),
  unit: z.string().min(1),
  aisle: z.string().min(1),
  notes: z.string().optional().nullable(),
});
export type CreateGroceryItemInput = z.infer<typeof createGroceryItemSchema>;

export const updateGroceryItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().optional(),
  unit: z.string().min(1).optional(),
  aisle: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  checked: z.boolean().optional(),
});
export type UpdateGroceryItemInput = z.infer<typeof updateGroceryItemSchema>;

// Body optionnel de PATCH /grocery-items/:id/check — valeur absolue pour un rejeu
// offline déterministe (sans body → bascule, comportement historique conservé).
export const checkItemSchema = z.object({
  checked: z.boolean().optional(),
});

export const archiveSchema = z.object({
  mode: z.enum(['checked', 'all']),
  ids: z.array(z.string()).optional(),
});

export const unarchiveSchema = z.object({
  ids: z.array(z.string()).optional(), // si absent → tout désarchiver
});

export const createAisleSchema = z.object({
  name: z.string().min(1).max(60),
  label: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateAisleSchema = z.object({
  label: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
