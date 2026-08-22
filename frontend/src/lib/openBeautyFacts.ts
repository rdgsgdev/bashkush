import axios from 'axios';
import type { CosmeticProduct } from '../types/analysis';

// ─────────────────────────────────────────────────────────────
// Client Open Beauty Facts — base ouverte des cosmétiques (même
// plateforme / API qu'Open Food Facts, gratuite, sans clé). Un
// code-barres absent d'OFF y est résolu en ingrédients INCI.
// ─────────────────────────────────────────────────────────────

const obfApi = axios.create({
  baseURL: 'https://world.openbeautyfacts.org',
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

/** Slugifie un tag INCI : « en:Alcohol Denat » → « alcohol-denat ». */
function slugifyTag(tag: string): string {
  return tag
    .replace(/^..:/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PARFUM_TAGS = new Set(['parfum', 'fragrance', 'parfum-fragrance']);

/** Le tag INCI désigne-t-il le parfum (déclaré à part sur l'emballage) ? */
export function isParfumTag(slug: string): boolean {
  return PARFUM_TAGS.has(slug);
}

function normalizeProduct(barcode: string, p: Record<string, unknown>): CosmeticProduct {
  const labelsTags = (p.labels_tags as string[] | undefined) ?? [];

  // Tags INCI : le parseur OBF produit parfois des fragments (« en:C12-15
  // Alkyl Ben » + « en:zoate ») — ils ne matcheront simplement aucune fiche
  // de la base locale (prudent, sans faux positif).
  const ingredients = [
    ...new Set(
      ((p.ingredients_tags as string[] | undefined) ?? [])
        .map(slugifyTag)
        .filter((slug) => slug.length > 1),
    ),
  ];

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
 * Récupère un cosmétique par code-barres.
 * Renvoie `null` si le produit est absent de la base (status 0 ou 404) ;
 * remonte les erreurs réseau à l'appelant (affichage réessayable).
 */
export async function getCosmeticProduct(barcode: string): Promise<CosmeticProduct | null> {
  let data: { status?: number; product?: Record<string, unknown> };
  try {
    const res = await obfApi.get(`/api/v2/product/${encodeURIComponent(barcode)}.json`, {
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
