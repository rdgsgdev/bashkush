import axios from 'axios';
import type { CosmeticProduct } from '../types/analysis';
import { normalizeIngredientTags } from './openBeautyFacts';

// ─────────────────────────────────────────────────────────────
// Client Open Products Facts — base ouverte « tous produits » de
// la même plateforme qu'Open Food Facts / Open Beauty Facts
// (gratuite, sans clé, même API v2). Beaucoup de cosmétiques
// (crèmes, lotions, eaux nettoyantes…) y figurent sans être dans
// Open Beauty Facts : c'est notre second canal de résolution.
// ─────────────────────────────────────────────────────────────

const opfApi = axios.create({
  baseURL: 'https://world.openproductsfacts.org',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_front_small_url',
  'labels_tags',
  'categories_tags',
  'ingredients_tags',
].join(',');

// Indices « produit non alimentaire / beauté » : un produit OPF n'est
// retenu comme cosmétique que s'il en porte un OU s'il a une composition.
// OPF mélange tout : sans ce filtre, un aliment absent d'OFF mais présent
// dans OPF serait analysé comme cosmétique.
const NON_FOOD_CATEGORY_RE = /cosmetic|beauty|non-food|open-beauty|personal-care|hygiene|perfume|skin|hair|soap|make-up|makeup|shav|dental|bath/i;

function looksCosmetic(categoriesTags: string[], hasIngredients: boolean): boolean {
  return hasIngredients || categoriesTags.some((t) => NON_FOOD_CATEGORY_RE.test(t));
}

function normalizeProduct(barcode: string, p: Record<string, unknown>): CosmeticProduct | null {
  const labelsTags = (p.labels_tags as string[] | undefined) ?? [];
  const categoriesTags = (p.categories_tags as string[] | undefined) ?? [];
  const ingredients = normalizeIngredientTags((p.ingredients_tags as string[] | undefined) ?? []);

  if (!looksCosmetic(categoriesTags, ingredients.length > 0)) return null;

  return {
    barcode,
    name: typeof p.product_name === 'string' && p.product_name.trim() ? p.product_name.trim() : `Produit ${barcode}`,
    brand: typeof p.brands === 'string' && p.brands.trim() ? p.brands.split(',')[0].trim() : null,
    imageUrl: typeof p.image_front_small_url === 'string' && p.image_front_small_url ? p.image_front_small_url : null,
    ingredients,
    isBio: labelsTags.some((t) => /bio|organic/i.test(t)),
    isVegan: labelsTags.some((t) => /vegan|cruelty[-_]free|not[-_]tested[-_]on[-_]animals/i.test(t)),
    isNatural: labelsTags.some((t) => /natural|naturel/i.test(t)),
    palmFree: labelsTags.some((t) => /palm[-_]oil[-_]free|sans[-_]huile[-_]de[-_]palme/i.test(t)),
  };
}

/**
 * Récupère un produit OPF par code-barres, s'il peut s'agir d'un
 * cosmétique (composition présente ou catégorie beauté/non-alimentaire).
 * Renvoie `null` si absent (status 0 / 404) ou s'il s'agit visiblement
 * d'un produit alimentaire ; remonte les erreurs réseau.
 */
export async function getOpenProduct(barcode: string): Promise<CosmeticProduct | null> {
  let data: { status?: number; product?: Record<string, unknown> };
  try {
    const res = await opfApi.get(`/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      params: { fields: FIELDS },
    });
    data = res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
  if (data?.status !== 1 || !data.product) return null;
  return normalizeProduct(barcode, data.product);
}
