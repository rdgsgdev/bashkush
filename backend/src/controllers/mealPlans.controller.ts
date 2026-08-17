import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { run, planMeal, updateMealPlan, deleteMealPlan } from '../lib/groceryEngine';
import { ensureFamilyId } from '../lib/family';
import { emitFamilyInvalidation } from '../realtime/io';
import { AuthedRequest } from '../middleware/auth';
import {
  createMealPlanSchema,
  updateMealPlanSchema,
  updateStatusSchema,
  updateStepsSchema,
} from '../schemas/mealPlan.schema';
import type { Ingredient, Meal } from '@prisma/client';
import type { Response } from 'express';

const planInclude = {
  meal: {
    include: {
      ingredients: { orderBy: { name: 'asc' as const } },
      steps: { orderBy: { stepNumber: 'asc' as const } },
    },
  },
  // Sélections précédentes du plan (mémoire de l'étape ingrédients en édition).
  contributions: { select: { ingredientId: true, quantity: true } },
} as const;

/** Vérifie que chaque id de sélection appartient bien au plat ciblé. */
function assertIngredientsBelongToMeal(selections: { id: string }[], mealIngredients: Ingredient[]) {
  const known = new Set(mealIngredients.map((i) => i.id));
  for (const s of selections) {
    if (!known.has(s.id)) {
      throw new HttpError(400, 'Ingrédient inconnu pour ce plat');
    }
  }
}

/**
 * Récupère les plans de la famille.
 *  - ?date=YYYY-MM-DD  → plans couvrant ce jour (from <= date <= to)
 *  - ?from=&to=        → plans intersectant la plage
 *  - sinon             → tous les plans de la famille
 */
function buildWhere(familyId: string, query: Record<string, unknown>) {
  const { date, from, to } = query as { date?: string; from?: string; to?: string };

  if (date) {
    const d = new Date(date);
    return { familyId, AND: [{ fromDate: { lte: d } }, { toDate: { gte: d } }] };
  }
  if (from && to) {
    return {
      familyId,
      AND: [{ fromDate: { lte: new Date(to) } }, { toDate: { gte: new Date(from) } }],
    };
  }
  return { familyId };
}

/** GET /api/meal-plans */
export const listMealPlans = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const plans = await prisma.mealPlan.findMany({
    where: buildWhere(familyId, req.query as Record<string, unknown>),
    include: planInclude,
    orderBy: { fromDate: 'asc' },
  });
  res.json(plans);
});

/** POST /api/meal-plans — crée un plan + génère la liste de courses. */
export const createMealPlan = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = createMealPlanSchema.parse(req.body);

  if (input.toDate < input.fromDate) {
    throw new HttpError(400, 'La date de fin doit être postérieure à la date de début');
  }

  // Le plat doit appartenir à la même famille que le plan.
  const meal = await prisma.meal.findFirst({
    where: { id: input.mealId, familyId },
    include: { ingredients: true },
  });
  if (!meal) throw new HttpError(404, 'Repas introuvable');

  if (input.ingredients) assertIngredientsBelongToMeal(input.ingredients, meal.ingredients);

  const plan = await run(prisma, (tx) =>
    planMeal(tx, {
      meal,
      familyId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      servings: input.servings,
      status: input.status,
      mealType: input.mealType,
      ingredientSelections: input.ingredients,
    }),
  );

  const result = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: planInclude,
  });
  emitFamilyInvalidation(familyId, ['mealPlans', 'grocery']);
  res.status(201).json(result);
});

/** PUT /api/meal-plans/:id — met à jour un plan (recompute liste si besoin). */
export const updateMealPlanCtrl = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = updateMealPlanSchema.parse(req.body);

  const plan = await prisma.mealPlan.findFirst({
    where: { id, familyId },
    include: { meal: { include: { ingredients: true } } },
  });
  if (!plan) throw new HttpError(404, 'Plan introuvable');

  // Un changement de plat ne peut cibler qu'un plat de la même famille.
  let targetMeal: (Meal & { ingredients: Ingredient[] }) | null = null;
  if (input.mealId !== undefined && input.mealId !== plan.mealId) {
    targetMeal = await prisma.meal.findFirst({
      where: { id: input.mealId, familyId },
      include: { ingredients: true },
    });
    if (!targetMeal) throw new HttpError(404, 'Repas introuvable');
  }

  if (input.ingredients) {
    assertIngredientsBelongToMeal(input.ingredients, (targetMeal ?? plan.meal).ingredients);
  }

  await run(prisma, (tx) =>
    updateMealPlan(tx, plan, { ...input, ingredientSelections: input.ingredients }),
  );

  const result = await prisma.mealPlan.findUniqueOrThrow({ where: { id }, include: planInclude });
  emitFamilyInvalidation(familyId, ['mealPlans', 'grocery']);
  res.json(result);
});

/** PATCH /api/meal-plans/:id/status — change uniquement le statut. */
export const updateStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status } = updateStatusSchema.parse(req.body);
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const existing = await prisma.mealPlan.findFirst({ where: { id, familyId } });
  if (!existing) throw new HttpError(404, 'Plan introuvable');
  const updated = await prisma.mealPlan.update({
    where: { id },
    data: { status },
    include: planInclude,
  });
  emitFamilyInvalidation(familyId, ['mealPlans']);
  res.json(updated);
});

/**
 * PATCH /api/meal-plans/:id/steps — enregistre les étapes cochées (valeur
 * absolue, idempotent) et dérive le statut côté serveur. Source de vérité
 * partagée : tous les membres de la famille voient les mêmes coches.
 */
export const updateSteps = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { completedSteps } = updateStepsSchema.parse(req.body);
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const existing = await prisma.mealPlan.findFirst({
    where: { id, familyId },
    include: { meal: { include: { steps: { select: { stepNumber: true } } } } },
  });
  if (!existing) throw new HttpError(404, 'Plan introuvable');

  const total = existing.meal.steps.length;
  const valid = [...new Set(completedSteps)].filter((n) => n >= 1 && n <= total);
  const status =
    total === 0
      ? existing.status
      : valid.length === 0
        ? 'a_faire'
        : valid.length >= total
          ? 'prepare'
          : 'en_preparation';

  const updated = await prisma.mealPlan.update({
    where: { id },
    data: { completedSteps: valid, status },
    include: planInclude,
  });
  emitFamilyInvalidation(familyId, ['mealPlans']);
  res.json(updated);
});

/** DELETE /api/meal-plans/:id — supprime un plan + met à jour la liste. */
export const deleteMealPlanCtrl = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const existing = await prisma.mealPlan.findFirst({ where: { id, familyId } });
  if (!existing) throw new HttpError(404, 'Plan introuvable');
  await run(prisma, (tx) => deleteMealPlan(tx, id));
  emitFamilyInvalidation(familyId, ['mealPlans', 'grocery']);
  res.status(204).send();
});
