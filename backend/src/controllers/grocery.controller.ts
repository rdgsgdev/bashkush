import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureFamilyId } from '../lib/family';
import { emitFamilyInvalidation } from '../realtime/io';
import { AuthedRequest } from '../middleware/auth';
import {
  createGroceryItemSchema,
  updateGroceryItemSchema,
  archiveSchema,
  unarchiveSchema,
  checkItemSchema,
} from '../schemas/grocery.schema';
import type { Response } from 'express';

/**
 * GET /api/grocery-items?archived=false
 * Renvoie { items, aisles } pour la famille. Les items sont triés par
 * rayon (sort_order) puis nom. Les rayons restent un catalogue global.
 */
export const listGroceryItems = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const archived = req.query.archived === 'true';

  const [items, aisles] = await Promise.all([
    prisma.groceryItem.findMany({
      where: { familyId, archived },
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

/** POST /api/grocery-items — ajoute un item manuel à la liste de la famille. */
export const createGroceryItem = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = createGroceryItemSchema.parse(req.body);

  // S'assurer que le rayon existe.
  await prisma.groceryAisle.upsert({
    where: { name: input.aisle },
    update: {},
    create: { name: input.aisle, label: input.aisle, sortOrder: 999 },
  });

  let item;
  try {
    item = await prisma.groceryItem.create({
      data: {
        // Id client optionnel : un rejeu de la file offline ne crée pas de doublon.
        ...(input.id ? { id: input.id } : {}),
        familyId,
        name: input.name,
        quantity: input.quantity,
        unit: input.unit,
        aisle: input.aisle,
        notes: input.notes,
        isManual: true,
      },
    });
  } catch (err) {
    // Conflit d'id (P2002) = action déjà rejouée : on renvoie l'item existant.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.groceryItem.findFirst({ where: { id: input.id, familyId } });
      if (existing) return res.json(existing);
    }
    throw err;
  }
  emitFamilyInvalidation(familyId, ['grocery']);
  res.status(201).json(item);
});

/** PUT /api/grocery-items/:id — modifie un item de la famille. */
export const updateGroceryItem = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = updateGroceryItemSchema.parse(req.body);

  const existing = await prisma.groceryItem.findFirst({ where: { id, familyId } });
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
  emitFamilyInvalidation(familyId, ['grocery']);
  res.json(item);
});

/** DELETE /api/grocery-items/:id — supprime définitivement un item de la famille. */
export const deleteGroceryItem = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const existing = await prisma.groceryItem.findFirst({ where: { id, familyId } });
  if (!existing) throw new HttpError(404, 'Item introuvable');
  // On supprime aussi les contributions (cascade) — l'item est retiré manuellement.
  await prisma.groceryItem.delete({ where: { id } });
  emitFamilyInvalidation(familyId, ['grocery']);
  res.status(204).send();
});

/**
 * PATCH /api/grocery-items/:id/check — bascule l'état « acheté ».
 * Accepte un body optionnel `{ checked }` (valeur absolue, utilisée par la
 * synchronisation offline) ; sans body, bascule comme auparavant.
 */
export const toggleCheck = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const { checked } = checkItemSchema.parse(req.body ?? {});
  const existing = await prisma.groceryItem.findFirst({ where: { id, familyId } });
  if (!existing) throw new HttpError(404, 'Item introuvable');
  const item = await prisma.groceryItem.update({
    where: { id },
    data: { checked: checked ?? !existing.checked },
  });
  emitFamilyInvalidation(familyId, ['grocery']);
  res.json(item);
});

/** POST /api/grocery-items/archive — archive (items cochés, ou tout) — liste de la famille. */
export const archiveItems = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const { mode, ids } = archiveSchema.parse(req.body);

  if (mode === 'checked') {
    await prisma.groceryItem.updateMany({
      where: { familyId, checked: true, archived: false, ...(ids ? { id: { in: ids } } : {}) },
      data: { archived: true },
    });
  } else {
    await prisma.groceryItem.updateMany({
      where: { familyId, archived: false, ...(ids ? { id: { in: ids } } : {}) },
      data: { archived: true, checked: false },
    });
  }
  emitFamilyInvalidation(familyId, ['grocery']);
  res.json({ ok: true });
});

/** POST /api/grocery-items/unarchive — désarchive (ids donnés, ou tout) — liste de la famille. */
export const unarchiveItems = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const { ids } = unarchiveSchema.parse(req.body);
  await prisma.groceryItem.updateMany({
    where: { familyId, archived: true, ...(ids ? { id: { in: ids } } : {}) },
    data: { archived: false },
  });
  emitFamilyInvalidation(familyId, ['grocery']);
  res.json({ ok: true });
});
