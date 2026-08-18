// ─────────────────────────────────────────────────────────────
// Listes paramétrables (page Paramètres) — catégories de plats,
// unités, magasins, types de repas. Scopées à une famille.
//
// Une famille sans lignes en base utilise les DÉFAUTS ci-dessous
// (miroir des listes historiquement hardcodées). Les défauts sont
// matérialisés en base au premier accès via la page Paramètres ;
// l'IA et les autres lecteurs utilisent le repli sans écriture.
// ─────────────────────────────────────────────────────────────

import { prisma } from '../prisma';

export const LIST_KEYS = ['category', 'unit', 'store', 'meal_type'] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export interface DefaultListOption {
  value: string;
  label: string;
}

// Miroir des options historiques du frontend (types/index.ts, lib/options.ts).
// Les valeurs des magasins doivent rester stables : les SVG embarqués
// /logos/<store>.svg s'appuient dessus (voir StoreLogo.tsx côté frontend).
export const DEFAULT_LISTS: Record<ListKey, DefaultListOption[]> = {
  category: [
    { value: 'bowl', label: 'Bowl' },
    { value: 'wrap', label: 'Wrap' },
    { value: 'salad', label: 'Salade' },
    { value: 'soup', label: 'Soupe' },
    { value: 'sandwich', label: 'Sandwich' },
    { value: 'pasta', label: 'Pâtes' },
    { value: 'stir_fry', label: 'Sauté' },
    { value: 'dessert', label: 'Dessert' },
    { value: 'smoothie', label: 'Smoothie' },
    { value: 'snack_food', label: 'Snack' },
    { value: 'side', label: 'Accompagnement' },
    { value: 'main', label: 'Plat principal' },
    { value: 'beverage', label: 'Boisson' },
  ],
  unit: [
    'g',
    'kg',
    'ml',
    'L',
    'c. à soupe',
    'c. à café',
    'pièce',
    'bouquet',
    'gousse',
    'tranche',
    'boîte',
    'tasse',
  ].map((u) => ({ value: u, label: u })),
  store: [
    { value: 'maxi', label: 'Maxi' },
    { value: 'iga', label: 'IGA' },
    { value: 'costco', label: 'Costco' },
    { value: 'jean_coutu', label: 'Jean Coutu' },
    { value: 'pharmaprix', label: 'Pharmaprix' },
  ],
  meal_type: [
    { value: 'petit_dejeuner', label: 'Petit-déjeuner' },
    { value: 'brunch', label: 'Brunch' },
    { value: 'diner', label: 'Dîner' },
    { value: 'souper', label: 'Souper' },
    { value: 'collation', label: 'Collation' },
  ],
};

/** Options d'une liste pour une famille, triées par sortOrder. */
export async function getListOptions(
  familyId: string,
  listKey: ListKey,
  opts: { materialize?: boolean } = {},
): Promise<{ id: string; value: string; label: string; sortOrder: number; logoUrl?: string | null }[]> {
  const rows = await prisma.listOption.findMany({
    where: { familyId, listKey },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: { id: true, value: true, label: true, sortOrder: true, logoUrl: true },
  });
  if (rows.length > 0) return rows;

  // Aucune ligne : la famille n'a jamais ouvert les Paramètres.
  if (!opts.materialize) {
    return DEFAULT_LISTS[listKey].map((o, i) => ({ id: '', ...o, sortOrder: i }));
  }

  // Premier accès aux Paramètres : on matérialise les défauts en base.
  // Deux membres peuvent ouvrir la page en même temps → conflit d'unicité
  // possible : on ignore et on relit l'état en base.
  try {
    await prisma.listOption.createMany({
      data: DEFAULT_LISTS[listKey].map((o, i) => ({
        familyId,
        listKey,
        value: o.value,
        label: o.label,
        sortOrder: i,
      })),
    });
  } catch {
    // Création concurrente : les lignes existent déjà, on relit ci-dessous.
  }
  return prisma.listOption.findMany({
    where: { familyId, listKey },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: { id: true, value: true, label: true, sortOrder: true, logoUrl: true },
  });
}

/** Réglages IA de la famille (toggles de la page Paramètres). */
export async function getFamilySettings(familyId: string): Promise<{
  aiMealGenerationEnabled: boolean;
  aiNutritionEnabled: boolean;
}> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { aiMealGenerationEnabled: true, aiNutritionEnabled: true },
  });
  // Famille introuvable (théorique : créée paresseusement) → défauts actifs.
  return {
    aiMealGenerationEnabled: family?.aiMealGenerationEnabled ?? true,
    aiNutritionEnabled: family?.aiNutritionEnabled ?? true,
  };
}
