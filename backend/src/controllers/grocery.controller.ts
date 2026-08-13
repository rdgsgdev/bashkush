import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import {
  createGroceryItemSchema,
  updateGroceryItemSchema,
  archiveSchema,
  unarchiveSchema,
} from '../schemas/grocery.schema';
import type { Response } from 'express';

/**
 * GET /api/grocery-items?archived=false
 * Renvoie { items, aisles }. Les items sont triés par rayon (sort_order) puis nom.
 */
export const listGroceryItems = asyncHandler(async (req, res: Response) => {
  const archived = req.query.archived === 'true';

  const [items, aisles] = await Promise.all([
    prisma.groceryItem.findMany({
      where: { archived },
      orderBy: [{ aisle: 'asc' }, { name: 'asc' }],
    }),
    prisma.groceryAisle.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  // Construit un map d'ordre de rayon (les rayons inconnus vont à la fin).
  const order = new Map<string, number>();
  aisles.forEach((a) => order.set(a.name, a.sortOrder));

  const sortedItems = [...items].sort((a, b) => {
    const oa = order.get(a.aisle) ?? 9999;
    const ob = order.get(b.aisle) ?? 9999;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name, 'fr');
  });

  res.json({ items: sortedItems, aisles });
});

/** POST /api/grocery-items — ajoute un item manuel. */
export const createGroceryItem = asyncHandler(async (req, res: Response) => {
  const input = createGroceryItemSchema.parse(req.body);

  // S'assurer que le rayon existe.
  await prisma.groceryAisle.upsert({
    where: { name: input.aisle },
    update: {},
    create: { name: input.aisle, label: input.aisle, sortOrder: 999 },
  });

  const item = await prisma.groceryItem.create({
    data: {
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      aisle: input.aisle,
      notes: input.notes,
      isManual: true,
    },
  });
  res.status(201).json(item);
});

/** PUT /api/grocery-items/:id — modifie un item. */
export const updateGroceryItem = asyncHandler(async (req, res: Response) => {
  const id = req.params.id;
  const input = updateGroceryItemSchema.parse(req.body);

  const existing = await prisma.groceryItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Item introuvable');

  // Si le rayon change vers un nouveau rayon, on l'enregistre.
  if (input.aisle && input.aisle !== existing.aisle) {
    await prisma.groceryAisle.upsert({
      where: { name: input.aisle },
      update: {},
      create: { name: input.aisle, label: input.aisle, sortOrder: 999 },
    });
  }

  // Toute modification manuelle fait basculer l'item en isManual (protégé de la suppression auto).
  const becameManual =
    !existing.isManual &&
    (input.name !== undefined ||
      input.quantity !== undefined ||
      input.unit !== undefined ||
      input.aisle !== undefined ||
      input.notes !== undefined);

  const item = await prisma.groceryItem.update({
    where: { id },
    data: { ...input, isManual: becameManual ? true : undefined },
  });
  res.json(item);
});

/** DELETE /api/grocery-items/:id — supprime définitivement un item. */
export const deleteGroceryItem = asyncHandler(async (req, res: Response) => {
  const id = req.params.id;
  const existing = await prisma.groceryItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Item introuvable');
  // On supprime aussi les contributions (cascade) — l'item est retiré manuellement.
  await prisma.groceryItem.delete({ where: { id } });
  res.status(204).send();
});

/** PATCH /api/grocery-items/:id/check — bascule l'état « acheté ». */
export const toggleCheck = asyncHandler(async (req, res: Response) => {
  const id = req.params.id;
  const existing = await prisma.groceryItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Item introuvable');
  const item = await prisma.groceryItem.update({
    where: { id },
    data: { checked: !existing.checked },
  });
  res.json(item);
});

/** POST /api/grocery-items/archive — archive (items cochés, ou tout). */
export const archiveItems = asyncHandler(async (req, res: Response) => {
  const { mode, ids } = archiveSchema.parse(req.body);

  if (mode === 'checked') {
    await prisma.groceryItem.updateMany({
      where: { checked: true, archived: false, ...(ids ? { id: { in: ids } } : {}) },
      data: { archived: true },
    });
  } else {
    await prisma.groceryItem.updateMany({
      where: { archived: false, ...(ids ? { id: { in: ids } } : {}) },
      data: { archived: true, checked: false },
    });
  }
  res.json({ ok: true });
});

/** POST /api/grocery-items/unarchive — désarchive (ids donnés, ou tout). */
export const unarchiveItems = asyncHandler(async (req, res: Response) => {
  const { ids } = unarchiveSchema.parse(req.body);
  await prisma.groceryItem.updateMany({
    where: { archived: true, ...(ids ? { id: { in: ids } } : {}) },
    data: { archived: false },
  });
  res.json({ ok: true });
});
