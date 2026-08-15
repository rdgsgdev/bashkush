import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { createMealSchema, updateMealSchema, CreateMealInput, UpdateMealInput } from '../schemas/meal.schema';
import { generateMealId } from '../lib/id';
import { uploadImage, deleteImage } from '../lib/storage';
import { run } from '../lib/groceryEngine';
import { ensureFamilyId } from '../lib/family';
import { AuthedRequest } from '../middleware/auth';
import type { Response } from 'express';

const mealInclude = {
  ingredients: { orderBy: { name: 'asc' as const } },
  steps: { orderBy: { stepNumber: 'asc' as const } },
} as const;

/** GET /api/meals — liste de la famille (favoris en premier, puis created_at desc). */
export const listMeals = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const meals = await prisma.meal.findMany({
    where: { familyId },
    orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    include: mealInclude,
  });
  res.json(meals);
});

/** GET /api/meals/:id — détail d'un repas (404 si hors de la famille). */
export const getMeal = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const meal = await prisma.meal.findFirst({
    where: { id: req.params.id, familyId },
    include: mealInclude,
  });
  if (!meal) throw new HttpError(404, 'Repas introuvable');
  res.json(meal);
});

function buildMealData(input: CreateMealInput | UpdateMealInput) {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.servings !== undefined) data.servings = input.servings;
  if (input.prepTime !== undefined) data.prepTime = input.prepTime;
  if (input.cookTime !== undefined) data.cookTime = input.cookTime;
  if (input.totalTime !== undefined) data.totalTime = input.totalTime;
  if (input.difficulty !== undefined) data.difficulty = input.difficulty;
  if (input.category !== undefined) data.category = input.category;
  if (input.nutrition !== undefined) data.nutrition = input.nutrition as any;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.ingredients !== undefined) {
    data.ingredients = {
      create: input.ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        aisle: i.aisle,
        optional: i.optional,
        notes: i.notes,
      })),
    };
  }
  if (input.steps !== undefined) {
    data.steps = {
      create: input.steps.map((s) => ({
        stepNumber: s.stepNumber,
        instruction: s.instruction,
        time: s.time ?? null,
        ingredients: s.ingredients ?? null,
      })),
    };
  }
  return data;
}

/** POST /api/meals — crée un repas pour la famille (création manuelle ou import JSON). */
export const createMeal = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = createMealSchema.parse(req.body) as CreateMealInput;
  const id = input.id || generateMealId(input.name);

  // Vérifie l'unicité de l'id.
  const existing = await prisma.meal.findUnique({ where: { id } });
  if (existing) throw new HttpError(409, `Un repas avec l'id « ${id} » existe déjà`);

  const meal = await prisma.meal.create({
    data: { id, familyId, ...buildMealData(input) },
    include: mealInclude,
  });
  res.status(201).json(meal);
});

/** PUT /api/meals/:id — met à jour un repas de la famille. */
export const updateMeal = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = updateMealSchema.parse(req.body) as UpdateMealInput;

  const meal = await run(prisma, async (tx) => {
    const existing = await tx.meal.findFirst({ where: { id, familyId } });
    if (!existing) throw new HttpError(404, 'Repas introuvable');

    // Pour les ingrédients/étapes : on remplace intégralement.
    if (input.ingredients !== undefined) {
      await tx.ingredient.deleteMany({ where: { mealId: id } });
    }
    if (input.steps !== undefined) {
      await tx.step.deleteMany({ where: { mealId: id } });
    }

    return tx.meal.update({ where: { id }, data: buildMealData(input), include: mealInclude });
  });

  res.json(meal);
});

/** DELETE /api/meals/:id — supprime un repas de la famille (cascade sur plans/ingrédients/étapes). */
export const deleteMeal = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const meal = await prisma.meal.findFirst({ where: { id, familyId } });
  if (!meal) throw new HttpError(404, 'Repas introuvable');

  await deleteImage(meal.imagePath);
  await prisma.meal.delete({ where: { id } });
  res.status(204).send();
});

/** PATCH /api/meals/:id/favorite — bascule le statut favori. */
export const toggleFavorite = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const meal = await prisma.meal.findFirst({ where: { id, familyId } });
  if (!meal) throw new HttpError(404, 'Repas introuvable');
  const updated = await prisma.meal.update({
    where: { id },
    data: { isFavorite: !meal.isFavorite },
  });
  res.json(updated);
});

/** POST /api/meals/:id/image — téléverse la photo d'un repas de la famille. */
export const uploadMealImage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const meal = await prisma.meal.findFirst({ where: { id, familyId } });
  if (!meal) throw new HttpError(404, 'Repas introuvable');
  if (!req.file) throw new HttpError(400, 'Aucune image reçue');

  const { url, path } = await uploadImage(req.file.buffer, req.file.mimetype, id);

  // Supprime l'ancienne image si présente.
  if (meal.imagePath) await deleteImage(meal.imagePath);

  const updated = await prisma.meal.update({
    where: { id },
    data: { imageUrl: url, imagePath: path },
  });
  res.json(updated);
});
