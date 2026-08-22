import axios from 'axios';
import type { OffProduct } from '../types/analysis';

// ─────────────────────────────────────────────────────────────
// Client Open Food Facts — base de produits ouverte (gratuite,
// sans clé). Uniquement des lectures : le code-barres scanné est
// résolu en données produit + nutriments /100 g.
// ─────────────────────────────────────────────────────────────

const offApi = axios.create({
  baseURL: 'https://world.openfoodfacts.org',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

// Champs restreints : la réponse complète (tous les nutriments, toutes
// les langues) est énorme — on ne demande que le nécessaire.
const FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_front_small_url',
  'labels_tags',
  'categories_tags',
  'additives_tags',
  'additives_n',
  'nutriments',
  'nova_groups',
  'nova_groups_tags',
  'nutriscore_grade',
  'ecoscore_grade',
  'ingredients_from_palm_oil_n',
  'ingredients_from_or_in_which_palm_oil_n',
].join(',');

/** Valide un code-barres décodé (EAN-8 / EAN-13 / UPC-A / UPC-E). */
export const BARCODE_RE = /^\d{6,14}$/;

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Note OFF « a »–« e » (Nutri-Score, Éco-Score) — null si absente ou inconnue. */
function gradeOf(value: unknown): string | null {
  return typeof value === 'string' && /^[a-e]$/.test(value) ? value : null;
}

/** Groupe NOVA 1–4 depuis `nova_groups` (entier) ou `nova_groups_tags` (« en:3 »). */
function novaGroupOf(p: Record<string, unknown>): number | null {
  const direct = num(p.nova_groups);
  if (direct !== null && direct >= 1 && direct <= 4) return Math.trunc(direct);
  const tags = (p.nova_groups_tags as string[] | undefined) ?? [];
  for (const tag of tags) {
    const m = /^..:(\d)$/.exec(tag);
    if (m) return Number(m[1]);
  }
  return null;
}

function normalizeProduct(barcode: string, p: Record<string, unknown>): OffProduct {
  const nutriments = (p.nutriments ?? {}) as Record<string, unknown>;

  // Sodium en mg /100 g : champ sodium (g) ou sel (g) en repli (sel = sodium × 2,5).
  const sodiumG = num(nutriments['sodium_100g']);
  const saltG = num(nutriments['salt_100g']);
  const sodiumMg = sodiumG !== null ? sodiumG * 1000 : saltG !== null ? (saltG / 2.5) * 1000 : null;

  const labelsTags = (p.labels_tags as string[] | undefined) ?? [];
  const categoriesTags = (p.categories_tags as string[] | undefined) ?? [];

  // Ingrédients dérivés du palmier : les deux champs OFF se complètent.
  const palmFrom = num(p.ingredients_from_palm_oil_n);
  const palmOrIn = num(p.ingredients_from_or_in_which_palm_oil_n);
  const palmOilCount =
    palmFrom !== null || palmOrIn !== null ? Math.max(palmFrom ?? 0, palmOrIn ?? 0) : null;

  return {
    barcode,
    name: typeof p.product_name === 'string' && p.product_name.trim() ? p.product_name.trim() : `Produit ${barcode}`,
    brand: typeof p.brands === 'string' && p.brands.trim() ? p.brands.split(',')[0].trim() : null,
    imageUrl: typeof p.image_front_small_url === 'string' && p.image_front_small_url ? p.image_front_small_url : null,
    isBeverage: categoriesTags.some((t) => t === 'en:beverages' || t.startsWith('en:beverages-')),
    isBio: labelsTags.some((t) => /bio|organic/i.test(t)),
    additives: ((p.additives_tags as string[] | undefined) ?? [])
      .map((t) => t.replace(/^..:/, '').trim())
      .filter(Boolean),
    additivesN: num(p.additives_n),
    fruitsVegetablesPct: num(nutriments['fruits-vegetables-nuts-estimate-from-ingredients_100g']),
    novaGroup: novaGroupOf(p),
    nutriscoreGrade: gradeOf(p.nutriscore_grade),
    ecoscoreGrade: gradeOf(p.ecoscore_grade),
    palmOilCount,
    nutriments: {
      energyKcal: num(nutriments['energy-kcal_100g']),
      energyKj: num(nutriments['energy-kj_100g']) ?? num(nutriments['energy_100g']),
      sugars: num(nutriments['sugars_100g']),
      saturatedFat: num(nutriments['saturated-fat_100g']),
      sodiumMg,
      fiber: num(nutriments['fiber_100g']),
      proteins: num(nutriments['proteins_100g']),
    },
  };
}

/**
 * Récupère un produit par code-barres.
 * Renvoie `null` si le produit est absent de la base (status 0 ou 404) ;
 * remonte les erreurs réseau à l'appelant (affichage réessayable).
 */
export async function getProduct(barcode: string): Promise<OffProduct | null> {
  let data: { status?: number; product?: Record<string, unknown> };
  try {
    const res = await offApi.get(`/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      params: { fields: FIELDS },
    });
    data = res.data;
  } catch (err) {
    // 404 : code-barres inconnu → produit introuvable (pas une erreur réseau).
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
  if (data?.status !== 1 || !data.product) return null;
  return normalizeProduct(barcode, data.product);
}
