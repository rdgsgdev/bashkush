import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { createAisleSchema, updateAisleSchema } from '../schemas/grocery.schema';
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
  res.status(201).json(aisle);
});

/** PUT /api/grocery-aisles/:name */
export const updateAisle = asyncHandler(async (req, res: Response) => {
  const name = req.params.name;
  const input = updateAisleSchema.parse(req.body);
  const existing = await prisma.groceryAisle.findUnique({ where: { name } });
  if (!existing) throw new HttpError(404, 'Rayon introuvable');
  const aisle = await prisma.groceryAisle.update({ where: { name }, data: input });
  res.json(aisle);
});

/** DELETE /api/grocery-aisles/:name — supprime le rayon (les items restent, rayon « orphelin »). */
export const deleteAisle = asyncHandler(async (req, res: Response) => {
  const name = req.params.name;
  const existing = await prisma.groceryAisle.findUnique({ where: { name } });
  if (!existing) throw new HttpError(404, 'Rayon introuvable');
  await prisma.groceryAisle.delete({ where: { name } });
  res.status(204).send();
});
