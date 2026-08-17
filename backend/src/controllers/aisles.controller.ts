import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { createAisleSchema, updateAisleSchema, reorderAislesSchema } from '../schemas/grocery.schema';
import { emitAllInvalidation } from '../realtime/io';
import type { Response } from 'express';

/** GET /api/grocery-aisles */
export const listAisles = asyncHandler(async (_req, res: Response) => {
  const aisles = await prisma.groceryAisle.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(aisles);
});

/** POST /api/grocery-aisles */
export const createAisle = asyncHandler(async (req, res: Response) => {
  const input = createAisleSchema.parse(req.body);
  const aisle = await prisma.groceryAisle.create({
    data: { name: input.name, label: input.label ?? input.name, sortOrder: input.sortOrder ?? 999 },
  });
  emitAllInvalidation(['aisles', 'grocery']);
  res.status(201).json(aisle);
});

/** PUT /api/grocery-aisles/:name */
export const updateAisle = asyncHandler(async (req, res: Response) => {
  const name = req.params.name;
  const input = updateAisleSchema.parse(req.body);
  const existing = await prisma.groceryAisle.findUnique({ where: { name } });
  if (!existing) throw new HttpError(404, 'Rayon introuvable');
  const aisle = await prisma.groceryAisle.update({ where: { name }, data: input });
  emitAllInvalidation(['aisles', 'grocery']);
  res.json(aisle);
});

/**
 * PUT /api/grocery-aisles/reorder — réordonnancement drag & drop des cards rayon.
 * Ordre absolu (rejeu offline idempotent) ; les rayons absents du body gardent
 * leur sortOrder. Rayons inconnus → 404 (contrairement aux items, le catalogue
 * est global et édité consciemment).
 */
export const reorderAisles = asyncHandler(async (req, res: Response) => {
  const { order } = reorderAislesSchema.parse(req.body);
  const names = order.map((o) => o.name);
  const existing = await prisma.groceryAisle.findMany({ where: { name: { in: names } } });
  const existingNames = new Set(existing.map((a) => a.name));
  const missing = names.find((n) => !existingNames.has(n));
  if (missing) throw new HttpError(404, `Rayon introuvable : ${missing}`);

  await prisma.$transaction(
    order.map((o) =>
      prisma.groceryAisle.update({ where: { name: o.name }, data: { sortOrder: o.sortOrder } }),
    ),
  );
  emitAllInvalidation(['aisles', 'grocery']);
  res.json({ ok: true, updated: order.length });
});

/** DELETE /api/grocery-aisles/:name — supprime le rayon (les items restent, rayon « orphelin »). */
export const deleteAisle = asyncHandler(async (req, res: Response) => {
  const name = req.params.name;
  const existing = await prisma.groceryAisle.findUnique({ where: { name } });
  if (!existing) throw new HttpError(404, 'Rayon introuvable');
  await prisma.groceryAisle.delete({ where: { name } });
  emitAllInvalidation(['aisles', 'grocery']);
  res.status(204).send();
});
