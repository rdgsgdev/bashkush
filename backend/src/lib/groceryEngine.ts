import { Prisma, PrismaClient } from '@prisma/client';
import type { Ingredient, Meal, MealPlan } from '@prisma/client';

/**
 * groceryEngine — génération atomique de la liste de courses à partir
 * de la planification des plats.
 *
 * Invariant :
 *  - addContributions(plan, ingredients)     → pour chaque ingrédient mis à l'échelle,
 *    on récupère (ou crée) l'item non-archivé correspondant (name+unit+aisle) et on
 *    incrémente sa quantité + on crée une contribution liée au plan.
 *  - removeContributions(plan)               → on décrémente les quantités, on supprime
 *    les contributions, et on supprime les items devenus orphelins (plus aucune
 *    contribution ET non manuels).
 *
 * Toutes les opérations s'exécutent à l'intérieur d'une transaction Prisma.
 */

type Tx = Prisma.TransactionClient;

/** Met à l'échelle une quantité selon le nombre de portions. */
export function scaleQuantity(qty: number, planServings: number, mealServings: number): number {
  const base = mealServings <= 0 ? 1 : mealServings;
  return Math.round((qty * (planServings / base)) * 1000) / 1000;
}

/** Crée le plan + ajoute les contributions de ses ingrédients (transaction). */
export async function planMeal(
  tx: Tx,
  params: {
    meal: Meal & { ingredients: Ingredient[] };
    fromDate: Date;
    toDate: Date;
    servings: number;
    status: string;
  },
): Promise<MealPlan> {
  const { meal, fromDate, toDate, servings, status } = params;

  const plan = await tx.mealPlan.create({
    data: {
      mealId: meal.id,
      fromDate,
      toDate,
      servings,
      status,
    },
  });

  await addContributions(tx, {
    mealPlanId: plan.id,
    ingredients: meal.ingredients,
    planServings: servings,
    mealServings: meal.servings,
  });

  return plan;
}

/** Ajoute les contributions d'ingrédients pour un plan donné. */
async function addContributions(
  tx: Tx,
  args: {
    mealPlanId: string;
    ingredients: Ingredient[];
    planServings: number;
    mealServings: number;
  },
): Promise<void> {
  const { mealPlanId, ingredients, planServings, mealServings } = args;

  for (const ing of ingredients) {
    const scaled = scaleQuantity(ing.quantity, planServings, mealServings);
    if (scaled <= 0) continue;

    // Recherche d'un item actif (non archivé) correspondant.
    let item = await tx.groceryItem.findFirst({
      where: { name: ing.name, unit: ing.unit, aisle: ing.aisle, archived: false },
    });

    if (!item) {
      item = await tx.groceryItem.create({
        data: {
          name: ing.name,
          unit: ing.unit,
          aisle: ing.aisle,
          quantity: 0,
          isManual: false,
        },
      });
    }

    // On crée la contribution et on incrémente la quantité de l'item.
    await tx.groceryContribution.create({
      data: {
        groceryItemId: item.id,
        mealPlanId,
        ingredientId: ing.id,
        quantity: scaled,
      },
    });

    await tx.groceryItem.update({
      where: { id: item.id },
      data: { quantity: { increment: scaled } },
    });

    // S'assurer que le rayon existe (pour l'ordre d'affichage).
    await tx.groceryAisle
      .upsert({
        where: { name: ing.aisle },
        update: {},
        create: { name: ing.aisle, label: ing.aisle, sortOrder: 999 },
      })
      .catch(() => undefined);
  }
}

/** Retire toutes les contributions d'un plan et nettoie les items orphelins. */
async function removeContributions(tx: Tx, mealPlanId: string): Promise<void> {
  const contributions = await tx.groceryContribution.findMany({
    where: { mealPlanId },
  });

  for (const c of contributions) {
    await tx.groceryItem.update({
      where: { id: c.groceryItemId },
      data: { quantity: { decrement: c.quantity } },
    });
  }

  // Supprimer les contributions.
  await tx.groceryContribution.deleteMany({ where: { mealPlanId } });

  // Nettoyer les items orphelins (sans contributions, non manuels).
  const itemIds = [...new Set(contributions.map((c) => c.groceryItemId))];
  for (const itemId of itemIds) {
    const remaining = await tx.groceryContribution.count({ where: { groceryItemId: itemId } });
    const item = await tx.groceryItem.findUnique({ where: { id: itemId } });
    if (!item) continue;
    if (remaining === 0 && !item.isManual) {
      await tx.groceryItem.delete({ where: { id: itemId } });
    }
  }
}

/**
 * Met à jour un plan. Si le plat ou le nombre de portions change, on recalcule
 * les contributions (remove puis add). Sinon, simple mise à jour des champs.
 */
export async function updateMealPlan(
  tx: Tx,
  plan: MealPlan & { meal: Meal & { ingredients: Ingredient[] } },
  input: {
    mealId?: string;
    fromDate?: Date;
    toDate?: Date;
    servings?: number;
    status?: string;
  },
): Promise<MealPlan> {
  const servingsChanged = input.servings !== undefined && input.servings !== plan.servings;
  const mealChanged = input.mealId !== undefined && input.mealId !== plan.mealId;

  let meal = plan.meal;
  if (mealChanged) {
    meal = await tx.meal.findUniqueOrThrow({
      where: { id: input.mealId! },
      include: { ingredients: true },
    });
  }

  const data: Prisma.MealPlanUpdateInput = {};
  if (input.fromDate) data.fromDate = input.fromDate;
  if (input.toDate) data.toDate = input.toDate;
  if (input.status) data.status = input.status;
  if (mealChanged) data.meal = { connect: { id: meal.id } };
  if (servingsChanged) data.servings = input.servings;

  if (servingsChanged || mealChanged) {
    await removeContributions(tx, plan.id);
    await addContributions(tx, {
      mealPlanId: plan.id,
      ingredients: meal.ingredients,
      planServings: input.servings ?? plan.servings,
      mealServings: meal.servings,
    });
  }

  return tx.mealPlan.update({ where: { id: plan.id }, data });
}

/** Supprime un plan et nettoie les contributions associées. */
export async function deleteMealPlan(tx: Tx, planId: string): Promise<void> {
  await removeContributions(tx, planId);
  await tx.mealPlan.delete({ where: { id: planId } });
}

/** Wrapper utilitaire pour exécuter une logique dans une transaction. */
export function run<T>(prisma: PrismaClient, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
