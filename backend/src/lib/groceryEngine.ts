import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import type { Ingredient, Meal, MealPlan } from '@prisma/client';

/**
 * groceryEngine — génération atomique de la liste de courses à partir
 * de la planification des plats.
 *
 * Toutes les opérations s'exécutent à l'intérieur d'une transaction Prisma
 * (timeout allongé à 30 s pour le free tier Render → latence Supabase).
 *
 * Les écritures sont BATCHÉES (createMany) plutôt que bouclées ingrédient par
 * ingrédient, afin d'éviter le pattern N+1 qui faisait dépasser le timeout
 * (erreur P2028) sur les repas à beaucoup d'ingrédients.
 */

type Tx = Prisma.TransactionClient;

/** Met à l'échelle une quantité selon le nombre de portions. */
export function scaleQuantity(qty: number, planServings: number, mealServings: number): number {
  const base = mealServings <= 0 ? 1 : mealServings;
  return Math.round((qty * (planServings / base)) * 1000) / 1000;
}

/**
 * Normalisation (minuscules, sans accents, espaces collapsés) servant de clé de
 * fusion : deux ingrédients ne différant que par la casse/les accents/les espaces
 * (ex: « Courgettes », « courgette », «  courgettes ») sont fusionnés en un seul
 * item de liste de courses. Le nom affiché reste celui de la première insertion.
 */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const itemKey = (name: string, unit: string, aisle: string) =>
  `${normalize(name)}\u0000${normalize(unit)}\u0000${normalize(aisle)}`;

/**
 * Sélection d'ingrédients choisie par l'utilisateur (modale de planification,
 * étape 2) : quantité finale par id d'ingrédient, déjà mise à l'échelle.
 */
export type IngredientSelections = Array<{ id: string; quantity: number }>;

/** Crée le plan + ajoute les contributions de ses ingrédients (transaction). */
export async function planMeal(
  tx: Tx,
  params: {
    meal: Meal & { ingredients: Ingredient[] };
    familyId: string;
    fromDate: Date;
    toDate: Date;
    servings: number;
    status: string;
    /** Si fourni, seuls ces ingrédients sont ajoutés, avec ces quantités. */
    ingredientSelections?: IngredientSelections;
  },
): Promise<MealPlan> {
  const { meal, familyId, fromDate, toDate, servings, status, ingredientSelections } = params;

  const plan = await tx.mealPlan.create({
    data: { familyId, mealId: meal.id, fromDate, toDate, servings, status },
  });

  await addContributions(tx, {
    mealPlanId: plan.id,
    familyId,
    ingredients: meal.ingredients,
    planServings: servings,
    mealServings: meal.servings,
    ingredientSelections,
  });

  return plan;
}

/** Ajoute les contributions d'ingrédients pour un plan donné (version batch). */
async function addContributions(
  tx: Tx,
  args: {
    mealPlanId: string;
    familyId: string;
    ingredients: Ingredient[];
    planServings: number;
    mealServings: number;
    /**
     * Sélection utilisateur : si fournie, limite les ajouts à ces ingrédients
     * avec ces quantités absolues (pas de mise à l'échelle). Sinon, tous les
     * ingrédients sont ajoutés, mis à l'échelle selon les portions.
     */
    ingredientSelections?: IngredientSelections;
  },
): Promise<void> {
  const { mealPlanId, familyId, ingredients, planServings, mealServings, ingredientSelections } = args;

  // Ingrédients mis à l'échelle (on ignore les quantités nulles).
  const selectionQty = ingredientSelections
    ? new Map(ingredientSelections.map((s) => [s.id, s.quantity]))
    : undefined;
  const scaled = ingredients
    .map((ing) => ({
      ing,
      qty: selectionQty
        ? (selectionQty.get(ing.id) ?? 0) // hors sélection → non ajouté
        : scaleQuantity(ing.quantity, planServings, mealServings),
    }))
    .filter((x) => x.qty > 0);
  if (scaled.length === 0) return;

  // 1) Charge tous les items actifs de la famille en UNE requête (set petit pour un usage perso).
  const activeItems = await tx.groceryItem.findMany({ where: { familyId, archived: false } });
  const itemIdByKey = new Map<string, string>();
  for (const it of activeItems) itemIdByKey.set(itemKey(it.name, it.unit, it.aisle), it.id);

  // 2) Répartit en mémoire : nouveaux items / deltas sur items existants / contributions.
  const newItems: Array<{
    id: string;
    familyId: string;
    name: string;
    unit: string;
    aisle: string;
    quantity: number;
    isManual: boolean;
  }> = [];
  const contributionsToCreate: Array<{
    groceryItemId: string;
    mealPlanId: string;
    ingredientId: string;
    quantity: number;
  }> = [];
  const existingDeltas = new Map<string, number>(); // itemId -> quantité à incrémenter
  const aislesToEnsure = new Set<string>();

  for (const { ing, qty } of scaled) {
    aislesToEnsure.add(ing.aisle);
    const key = itemKey(ing.name, ing.unit, ing.aisle);
    const existingId = itemIdByKey.get(key);
    if (existingId) {
      existingDeltas.set(existingId, (existingDeltas.get(existingId) ?? 0) + qty);
      contributionsToCreate.push({ groceryItemId: existingId, mealPlanId, ingredientId: ing.id, quantity: qty });
    } else {
      // Nouvel item : UUID généré pour pouvoir lier la contribution + dédupliquer.
      const id = randomUUID();
      itemIdByKey.set(key, id);
      newItems.push({ id, familyId, name: ing.name, unit: ing.unit, aisle: ing.aisle, quantity: qty, isManual: false });
      contributionsToCreate.push({ groceryItemId: id, mealPlanId, ingredientId: ing.id, quantity: qty });
    }
  }

  // 3) Écritures en lot (createMany) — l'ordre compte : items avant contributions.
  if (newItems.length > 0) {
    await tx.groceryItem.createMany({ data: newItems });
  }
  if (contributionsToCreate.length > 0) {
    await tx.groceryContribution.createMany({ data: contributionsToCreate });
  }
  for (const [itemId, delta] of existingDeltas) {
    await tx.groceryItem.update({ where: { id: itemId }, data: { quantity: { increment: delta } } });
  }

  // 4) Ensure les rayons (batch : on ne crée que les manquants).
  if (aislesToEnsure.size > 0) {
    const names = [...aislesToEnsure];
    const existing = await tx.groceryAisle.findMany({ where: { name: { in: names } }, select: { name: true } });
    const have = new Set(existing.map((a) => a.name));
    const missing = names.filter((n) => !have.has(n));
    if (missing.length > 0) {
      await tx.groceryAisle
        .createMany({ data: missing.map((n) => ({ name: n, label: n, sortOrder: 999 })) })
        .catch(() => undefined);
    }
  }
}

/** Retire toutes les contributions d'un plan et nettoie les items orphelins (version batch). */
async function removeContributions(tx: Tx, mealPlanId: string): Promise<void> {
  const contributions = await tx.groceryContribution.findMany({ where: { mealPlanId } });
  if (contributions.length === 0) return;

  // Delta (négatif) par item.
  const deltas = new Map<string, number>();
  for (const c of contributions) {
    deltas.set(c.groceryItemId, (deltas.get(c.groceryItemId) ?? 0) - c.quantity);
  }

  // Supprime les contributions de ce plan.
  await tx.groceryContribution.deleteMany({ where: { mealPlanId } });

  const itemIds = [...deltas.keys()];

  // Charge les items concernés + les contributions restantes (pour détecter les orphelins).
  // ⚠️ Séquentiel : une transaction Prisma interactive n'accepte pas les requêtes
  // concurrentes (Promise.all sur `tx` => blocage de la transaction).
  const items = await tx.groceryItem.findMany({ where: { id: { in: itemIds } } });
  const remaining = await tx.groceryContribution.findMany({
    where: { groceryItemId: { in: itemIds } },
    select: { groceryItemId: true },
  });

  const remainingCount = new Map<string, number>();
  for (const r of remaining) remainingCount.set(r.groceryItemId, (remainingCount.get(r.groceryItemId) ?? 0) + 1);

  const toDelete: string[] = [];
  for (const item of items) {
    const count = remainingCount.get(item.id) ?? 0;
    // Orphelin (plus aucune contribution) ET non manuel → suppression.
    if (count === 0 && !item.isManual) {
      toDelete.push(item.id);
    } else {
      await tx.groceryItem.update({
        where: { id: item.id },
        data: { quantity: { increment: deltas.get(item.id) ?? 0 } },
      });
    }
  }

  if (toDelete.length > 0) {
    await tx.groceryItem.deleteMany({ where: { id: { in: toDelete } } });
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
    /** Si fourni, recalcule les contributions avec cette sélection utilisateur. */
    ingredientSelections?: IngredientSelections;
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
  if (mealChanged) {
    data.meal = { connect: { id: meal.id } };
    // Les étapes cochées se rapportent à l'ancien plat → on repart de zéro.
    data.completedSteps = [];
  }
  if (servingsChanged) data.servings = input.servings;

  if (servingsChanged || mealChanged) {
    await removeContributions(tx, plan.id);
    await addContributions(tx, {
      mealPlanId: plan.id,
      familyId: plan.familyId,
      ingredients: meal.ingredients,
      planServings: input.servings ?? plan.servings,
      mealServings: meal.servings,
      ingredientSelections: input.ingredientSelections,
    });
  }

  return tx.mealPlan.update({ where: { id: plan.id }, data });
}

/** Supprime un plan et nettoie les contributions associées. */
export async function deleteMealPlan(tx: Tx, planId: string): Promise<void> {
  await removeContributions(tx, planId);
  await tx.mealPlan.delete({ where: { id: planId } });
}

/**
 * Wrapper utilitaire : exécute une logique dans une transaction.
 * Timeout allongé (30 s) pour absorber la latence Render → Supabase,
 * sinon les transactions interactives sont coupées (P2028).
 */
export function run<T>(prisma: PrismaClient, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { maxWait: 10000, timeout: 30000 });
}
