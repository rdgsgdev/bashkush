import { z } from 'zod';

export const createGroceryItemSchema = z.object({
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
