import type { CosmeticProduct } from '../types/analysis';
import { getCosmeticProduct } from './openBeautyFacts';
import { getOpenProduct } from './openProductsFacts';

// ─────────────────────────────────────────────────────────────
// Résolution d'un cosmétique par code-barres, multi-sources :
// 1. Open Beauty Facts (base cosmétique dédiée) ;
// 2. Open Products Facts (tous produits) si OBF ne connaît pas
//    le code — ou pour compléter une fiche OBF sans composition.
// Les champs déjà renseignés par OBF sont conservés ; OPF ne
// comble que les manques (ingrédients, image, labels…).
// ─────────────────────────────────────────────────────────────

/** Fusion : OBF prioritaire, OPF en complément des manques. */
function mergeCosmetic(primary: CosmeticProduct, fallback: CosmeticProduct): CosmeticProduct {
  const or = (a: boolean, b: boolean) => a || b;
  return {
    ...primary,
    name: primary.name.startsWith('Produit ') ? fallback.name : primary.name,
    brand: primary.brand ?? fallback.brand,
    imageUrl: primary.imageUrl ?? fallback.imageUrl,
    ingredients: primary.ingredients.length > 0 ? primary.ingredients : fallback.ingredients,
    isBio: or(primary.isBio, fallback.isBio),
    isVegan: or(primary.isVegan, fallback.isVegan),
    isNatural: or(primary.isNatural, fallback.isNatural),
    palmFree: or(primary.palmFree, fallback.palmFree),
  };
}

/**
 * Résout un cosmétique : Open Beauty Facts d'abord, Open Products Facts
 * en repli/complément. `null` = introuvable dans les deux bases ; les
 * erreurs réseau (hors ligne, timeout) remontent à l'appelant. Le repli
 * OPF quand OBF a répondu sans composition est silencieux : une panne du
 * second canal ne doit pas faire échouer le scan.
 */
export async function resolveCosmeticProduct(barcode: string): Promise<CosmeticProduct | null> {
  const obf = await getCosmeticProduct(barcode);

  if (obf && obf.ingredients.length > 0) return obf;

  // OPF en repli ; en complément d'une fiche OBF sans composition, ses
  // propres pannes sont ignorées (on garde la fiche OBF telle quelle).
  let opf: CosmeticProduct | null = null;
  try {
    opf = await getOpenProduct(barcode);
  } catch (err) {
    if (!obf) throw err;
  }

  if (obf) return opf ? mergeCosmetic(obf, opf) : obf;
  return opf;
}
