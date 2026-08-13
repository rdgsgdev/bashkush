import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { run, planMeal, updateMealPlan, deleteMealPlan } from '../lib/groceryEngine';
import {
  createMealPlanSchema,
  updateMealPlanSchema,
  updateStatusSchema,
} from '../schemas/mealPlan.schema';
import type { Response } from 'express';

const planInclude = {
  meal: {
    include: {
      ingredients: { orderBy: { name: 'asc' as const } },
      steps: { orderBy: { stepNumber: 'asc' as const } },
    },
  },
} as const;

/**
 * Récupère les plans.
 *  - ?date=YYYY-MM-DD  → plans couvrant ce jour (from <= date <= to)
 *  - ?from=&to=        → plans intersectant la plage
 *  - sinon             → tous les plans
 */
function buildWhere(query: Record<string, unknown>) {
  const { date, from, to } = query as { date?: string; from?: string; to?: string };

  if (date) {
    const d = new Date(date);
    return { AND: [{ fromDate: { lte: d } }, { toDate: { gte: d } }] };
  }
  if (from && to) {
    return {
      AND: [{ fromDate: { lte: new Date(to) } }, { toDate: { gte: new Date(from) } }],
    };
  }
  return undefined;
}

/** GET /api/meal-plans */
export const listMealPlans = asyncHandler(async (req, res: Response) => {
  const plans = await prisma.mealPlan.findMany({
    where: buildWhere(req.query as Record<string, unknown>),
    include: planInclude,
    orderBy: { fromDate: 'asc' },
  });
  res.json(plans);
});

/** POST /api/meal-plans — crée un plan + génère la liste de courses. */
export const createMealPlan = asyncHandler(async (req, res: Response) => {
  const input = createMealPlanSchema.parse(req.body);

  if (input.toDate < input.fromDate) {
    throw new HttpError(400, 'La date de fin doit être postérieure à la date de début');
  }

  const meal = await prisma.meal.findUnique({
    where: { id: input.mealId },
    include: { ingredients: true },
  });
  if (!meal) throw new HttpError(404, 'Repas introuvable');

  const plan = await run(prisma, (tx) =>
    planMeal(tx, {
      meal,
      fromDate: input.fromDate,
      toDate: input.toDate,
      servings: input.servings,
      status: input.status,
    }),
  );

  const result = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: planInclude,
  });
  res.status(201).json(result);
});

/** PUT /api/meal-plans/:id — met à jour un plan (recompute liste si besoin). */
export const updateMealPlanCtrl = asyncHandler(async (req, res: Response) => {
  const id = req.params.id;
  const input = updateMealPlanSchema.parse(req.body);

  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: { meal: { include: { ingredients: true } } },
  });
  if (!plan) throw new HttpError(404, 'Plan introuvable');

  await run(prisma, (tx) => updateMealPlan(tx, plan, input));

  const result = await prisma.mealPlan.findUniqueOrThrow({ where: { id }, include: planInclude });
  res.json(result);
});

/** PATCH /api/meal-plans/:id/status — change uniquement le statut. */
export const updateStatus = asyncHandler(async (req, res: Response) => {
  const { status } = updateStatusSchema.parse(req.body);
  const id = req.params.id;
  const existing = await prisma.mealPlan.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Plan introuvable');
  const updated = await prisma.mealPlan.update({
    where: { id },
    data: { status },
    include: planInclude,
  });
  res.json(updated);
});

/** DELETE /api/meal-plans/:id — supprime un plan + met à jour la liste. */
export const deleteMealPlanCtrl = asyncHandler(async (req, res: Response) => {
  const id = req.params.id;
  const existing = await prisma.mealPlan.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Plan introuvable');
  await run(prisma, (tx) => deleteMealPlan(tx, id));
  res.status(204).send();
});
