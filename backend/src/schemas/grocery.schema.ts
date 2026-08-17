import { z } from 'zod';

export const createGroceryItemSchema = z.object({
  // Id optionnel généré par le client : rend le rejeu de la file offline idempotent.
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().optional().default(1),
  unit: z.string().min(1),
  aisle: z.string().min(1),
  store: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateGroceryItemInput = z.infer<typeof createGroceryItemSchema>;

export const updateGroceryItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().optional(),
  unit: z.string().min(1).optional(),
  aisle: z.string().min(1).optional(),
  store: z.string().optional().nullable(),
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

// Body de PUT /grocery-items/reorder — positions absolues par item (rejeu
// offline idempotent). `aisle` permet de déplacer l'item vers un autre rayon
// sans passer par la modale d'édition (drag & drop).
export const reorderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        aisle: z.string().min(1),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;

// Body de PUT /grocery-aisles/reorder — ordre absolu des rayons visibles.
export const reorderAislesSchema = z.object({
  order: z
    .array(
      z.object({
        name: z.string().min(1),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});
export type ReorderAislesInput = z.infer<typeof reorderAislesSchema>;

export const createAisleSchema = z.object({
  name: z.string().min(1).max(60),
  label: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateAisleSchema = z.object({
  label: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
