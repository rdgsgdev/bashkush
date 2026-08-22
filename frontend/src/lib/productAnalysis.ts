import type {
  AnalysisCriterion,
  CriterionKey,
  OffProduct,
  ProductAnalysis,
  ScanGrade,
} from '../types/analysis';
import { CRITERION_LABELS } from '../types/analysis';
import { getAdditiveInfo } from './additives';
import { formatQty } from './utils';

// ─────────────────────────────────────────────────────────────
// Algorithme d'analyse (sans IA) — inspiré de la méthode Yuka :
// - base Nutri-Score SANS protéines (les critères affichés
//   pilotent exactement le score) mappée sur 100 points ;
// - repli sur le Nutri-Score officiel OFF quand les nutriments
//   indispensables manquent (score estimé, signalé `estimated`) ;
// - pénalités additifs, NOVA 4 et huile de palme, bonus bio et
//   Éco-Score sur le score final ;
// - chaque critère bascule en qualité ou défaut selon des seuils
//   réglementaires UE « low / high » par 100 g (spécifiques boissons).
// Fonction pure : testable et rejouable à l'identique.
// ─────────────────────────────────────────────────────────────

// ── Tables de points Nutri-Score ─────────────────────────────
// Nombre de bornes dépassées = points (0..10). Tables solides et
// boissons distinctes pour l'énergie et les sucres (officielles).

// Énergie kJ/100 g (solides) : ≤335 → 0 … >3350 → 10.
const ENERGY_SOLID = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
// Énergie kJ/100 ml (boissons) : 0 → 0, >30 → 1 … >270 → 10.
const ENERGY_BEVERAGE = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270];
// Sucres g/100 g (solides) : ≤4,5 → 0 … >45 → 10.
const SUGARS_SOLID = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
// Sucres g/100 ml (boissons) : ≤0,5 → 0 … >9,5 → 10.
const SUGARS_BEVERAGE = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5];
// Graisses saturées g (solides et boissons) : ≤1 → 0 … >10 → 10.
const SATURATED_FAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Sodium mg (solides et boissons) : ≤90 → 0 … >900 → 10.
const SODIUM = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];
// Fibres g : ≤0,9 → 0, >0,9–1,9 → 1, >1,9–2,8 → 2, >2,8–3,5 → 3, >3,5 → 4.
const FIBER = [0.9, 1.9, 2.8, 3.5];

/** Points = nombre de bornes strictement dépassées (capé au tableau). */
function pointsFor(value: number | null, thresholds: number[]): number {
  if (value === null) return 0;
  let pts = 0;
  for (const t of thresholds) {
    if (value > t) pts += 1;
    else break;
  }
  return pts;
}

/** Points fruits & légumes : solides ≤40 %→0, 40-60 %→1, 60-80 %→2, >80 %→5 ; boissons 40-60 %→2, >60 %→4. */
function fruitsVegetablesPoints(pct: number | null, isBeverage: boolean): number {
  if (pct === null) return 0;
  if (isBeverage) return pct > 60 ? 4 : pct > 40 ? 2 : 0;
  return pct > 80 ? 5 : pct > 60 ? 2 : pct > 40 ? 1 : 0;
}

// ── Additifs ─────────────────────────────────────────────────
// Le classement détaillé (fiches, niveaux de risque, variantes
// E322i → E322) vit dans lib/additives — ici, seule la pénalité de
// score utilise le groupe « à risque » (source unique : la base,
// via getAdditiveInfo).
const ADDITIVES_PENALTY_CAP = 40;
const HIGH_RISK_PENALTY = 10;
const OTHER_ADDITIVE_PENALTY = 2;
const BIO_BONUS = 5;

// ── NOVA, huile de palme, Éco-Score, repli Nutri-Score ──────
// Ajustements modérés : ils enrichissent la note sans la dénaturer
// (l'ultra-transformation recoupe en partie la pénalité additifs).
const NOVA4_PENALTY = 8;
const PALM_OIL_PENALTY = 5;
const ECOSCORE_BONUS = 3;
/** Nutri-Score officiel OFF → score /100 estimé quand les nutriments
    indispensables manquent (milieux des tranches de notre échelle). */
const NUTRISCORE_FALLBACK: Record<string, number> = { a: 88, b: 72, c: 52, d: 30, e: 12 };

// ── Seuils qualité / défaut (règlement UE « low / high », /100 g) ──
// Boissons : sucres et calories 2× plus stricts (per 100 ml).
interface Thresholds {
  caloriesGood: number;
  caloriesBad: number;
  sugarsGood: number;
  sugarsBad: number;
  satFatGood: number;
  satFatBad: number;
  sodiumGoodMg: number;
  sodiumBadMg: number;
  fiberGood: number;
  fruitsVegetablesGood: number;
  proteinsGood: number;
}
const SOLID_THRESHOLDS: Thresholds = {
  caloriesGood: 120,
  caloriesBad: 400,
  sugarsGood: 5,
  sugarsBad: 22.5,
  satFatGood: 1.5,
  satFatBad: 5,
  sodiumGoodMg: 120,
  sodiumBadMg: 600,
  fiberGood: 3,
  fruitsVegetablesGood: 40,
  proteinsGood: 8,
};
const BEVERAGE_THRESHOLDS: Thresholds = {
  ...SOLID_THRESHOLDS,
  caloriesGood: 60,
  caloriesBad: 200,
  sugarsGood: 2.5,
  sugarsBad: 11.25,
  proteinsGood: 3,
};

function criterion(key: CriterionKey, status: 'good' | 'bad', detail: string): AnalysisCriterion {
  return { key, label: CRITERION_LABELS[key], status, detail };
}

/** Formatte un nutriment « 12 g / 100 g » (ou /100 ml pour les boissons). */
function per100(value: number, unit: string, isBeverage: boolean): string {
  return `${formatQty(value)} ${unit} / 100 ${isBeverage ? 'ml' : 'g'}`;
}

function gradeFor(score: number): ScanGrade {
  if (score >= 75) return 'bon';
  if (score >= 50) return 'moyen';
  if (score >= 25) return 'mauvais';
  return 'tres_mauvais';
}

/**
 * Analyse un produit Open Food Facts normalisé :
 * score /100 + classe + liste de qualités et de défauts.
 * Un critère sans donnée est omis ; score null si les nutriments
 * négatifs indispensables (énergie, sucres, AGS, sodium) manquent.
 */
export function analyzeProduct(product: OffProduct): ProductAnalysis {
  const { nutriments, isBeverage } = product;
  const th = isBeverage ? BEVERAGE_THRESHOLDS : SOLID_THRESHOLDS;

  const positives: AnalysisCriterion[] = [];
  const negatives: AnalysisCriterion[] = [];

  // ── Base Nutri-Score (sans protéines) ─────────────────────
  const energyKj =
    nutriments.energyKj ?? (nutriments.energyKcal !== null ? nutriments.energyKcal * 4.184 : null);
  const hasBase =
    energyKj !== null &&
    nutriments.sugars !== null &&
    nutriments.saturatedFat !== null &&
    nutriments.sodiumMg !== null;

  let score: number | null = null;
  let estimated = false;
  if (hasBase) {
    const N =
      pointsFor(energyKj, isBeverage ? ENERGY_BEVERAGE : ENERGY_SOLID) +
      pointsFor(nutriments.sugars, isBeverage ? SUGARS_BEVERAGE : SUGARS_SOLID) +
      pointsFor(nutriments.saturatedFat, SATURATED_FAT) +
      pointsFor(nutriments.sodiumMg, SODIUM);
    const P =
      pointsFor(nutriments.fiber, FIBER) +
      fruitsVegetablesPoints(product.fruitsVegetablesPct, isBeverage);
    // N ∈ [0..40], P ∈ [0..9] → s ∈ [-9..40] → mappé linéairement sur 0..100.
    score = Math.round(((40 - (N - P)) / 49) * 100);
  } else if (product.nutriscoreGrade !== null) {
    // Nutriments incomplets mais Nutri-Score officiel OFF connu :
    // estimation repartant de sa note (les ajustements s'appliquent aussi).
    score = NUTRISCORE_FALLBACK[product.nutriscoreGrade];
    estimated = true;
  }

  // ── Critères qualité / défaut ─────────────────────────────
  if (nutriments.energyKcal !== null) {
    if (nutriments.energyKcal <= th.caloriesGood) {
      positives.push(
        criterion('calories', 'good', per100(nutriments.energyKcal, 'kcal', isBeverage)),
      );
    } else if (nutriments.energyKcal >= th.caloriesBad) {
      negatives.push(
        criterion('calories', 'bad', per100(nutriments.energyKcal, 'kcal', isBeverage)),
      );
    }
  }
  if (nutriments.sugars !== null) {
    if (nutriments.sugars <= th.sugarsGood) {
      positives.push(criterion('sucres', 'good', per100(nutriments.sugars, 'g', isBeverage)));
    } else if (nutriments.sugars >= th.sugarsBad) {
      negatives.push(criterion('sucres', 'bad', per100(nutriments.sugars, 'g', isBeverage)));
    }
  }
  if (nutriments.saturatedFat !== null) {
    if (nutriments.saturatedFat <= th.satFatGood) {
      positives.push(criterion('satures', 'good', per100(nutriments.saturatedFat, 'g', isBeverage)));
    } else if (nutriments.saturatedFat >= th.satFatBad) {
      negatives.push(criterion('satures', 'bad', per100(nutriments.saturatedFat, 'g', isBeverage)));
    }
  }
  if (nutriments.sodiumMg !== null) {
    const detail = per100(nutriments.sodiumMg >= 1000 ? nutriments.sodiumMg / 1000 : nutriments.sodiumMg, nutriments.sodiumMg >= 1000 ? 'g' : 'mg', isBeverage);
    if (nutriments.sodiumMg <= th.sodiumGoodMg) {
      positives.push(criterion('sodium', 'good', detail));
    } else if (nutriments.sodiumMg >= th.sodiumBadMg) {
      negatives.push(criterion('sodium', 'bad', detail));
    }
  }
  if (nutriments.fiber !== null && nutriments.fiber >= th.fiberGood) {
    positives.push(criterion('fibres', 'good', per100(nutriments.fiber, 'g', isBeverage)));
  }
  if (nutriments.proteins !== null && nutriments.proteins >= th.proteinsGood) {
    positives.push(criterion('proteines', 'good', per100(nutriments.proteins, 'g', isBeverage)));
  }
  if (product.fruitsVegetablesPct !== null && product.fruitsVegetablesPct >= th.fruitsVegetablesGood) {
    positives.push(criterion('fruits_legumes', 'good', `${formatQty(product.fruitsVegetablesPct)} %`));
  }
  if (product.isBio) {
    positives.push(criterion('bio', 'good', 'Produit bio'));
  }

  // ── NOVA (degré de transformation) ────────────────────────
  if (product.novaGroup === 1) {
    positives.push(criterion('nova', 'good', 'Groupe NOVA 1'));
  } else if (product.novaGroup === 4) {
    negatives.push(criterion('nova', 'bad', 'Groupe NOVA 4'));
  }

  // ── Huile de palme ────────────────────────────────────────
  if (product.palmOilCount !== null && product.palmOilCount > 0) {
    negatives.push(criterion('palme', 'bad', `${product.palmOilCount} ingrédient${product.palmOilCount > 1 ? 's' : ''} palmier`));
  }

  // ── Éco-Score (impact environnemental OFF) ────────────────
  if (product.ecoscoreGrade === 'a' || product.ecoscoreGrade === 'b') {
    positives.push(criterion('ecoscore', 'good', `Éco-Score ${product.ecoscoreGrade.toUpperCase()}`));
  } else if (product.ecoscoreGrade === 'd' || product.ecoscoreGrade === 'e') {
    negatives.push(criterion('ecoscore', 'bad', `Éco-Score ${product.ecoscoreGrade.toUpperCase()}`));
  }

  // ── Additifs : qualité / défaut + pénalité sur le score ────
  const highRisk = product.additives.filter((a) => getAdditiveInfo(a).risk === 'a_risque');
  if (product.additives.length > 0) {
    const count = product.additives.length;
    const withRisk = highRisk.length > 0 ? ` dont ${highRisk.length} à risque` : '';
    negatives.push(
      criterion('additifs', 'bad', `${count} additif${count > 1 ? 's' : ''}${withRisk}`),
    );
  } else if (product.additivesN === 0) {
    // Compteur explicite OFF à 0 : l'absence d'additifs est avérée
    // (une simple liste vide sans compteur peut signifier « donnée manquante »).
    positives.push(criterion('additifs', 'good', '0 additif'));
  }

  if (score !== null) {
    const penalty = Math.min(
      ADDITIVES_PENALTY_CAP,
      highRisk.length * HIGH_RISK_PENALTY +
        (product.additives.length - highRisk.length) * OTHER_ADDITIVE_PENALTY,
    );
    const novaPenalty = product.novaGroup === 4 ? NOVA4_PENALTY : 0;
    const palmPenalty =
      product.palmOilCount !== null && product.palmOilCount > 0 ? PALM_OIL_PENALTY : 0;
    const ecoscoreBonus =
      product.ecoscoreGrade === 'a' || product.ecoscoreGrade === 'b' ? ECOSCORE_BONUS : 0;
    score = Math.max(
      0,
      Math.min(
        100,
        score - penalty - novaPenalty - palmPenalty + (product.isBio ? BIO_BONUS : 0) + ecoscoreBonus,
      ),
    );
  }

  return {
    score,
    grade: score === null ? 'inconnu' : gradeFor(score),
    positives,
    negatives,
    ...(estimated ? { estimated: true } : {}),
  };
}
