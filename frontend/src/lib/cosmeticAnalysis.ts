import type {
  AnalysisCriterion,
  CosmeticProduct,
  CriterionKey,
  ProductAnalysis,
} from '../types/analysis';
import { CRITERION_LABELS } from '../types/analysis';
import { ingredientsInfos } from './cosmetics';
import { isParfumTag } from './openBeautyFacts';
// ─────────────────────────────────────────────────────────────
// Algorithme d'analyse des cosmétiques (sans IA) — inspiré de la
// méthode Yuka : la note part de 100 et pénalise les ingrédients
// controversés identifiés dans la composition INCI fournie par
// Open Beauty Facts :
// - −20 par ingrédient « à risque » (plafond −60) ;
// - −8 par ingrédient « à risque limité » (plafond −24) ;
// - +5 si le produit est certifié bio ;
// score null (Inconnu) si la composition n'est pas renseignée.
// Fonction pure : testable et rejouable à l'identique.
// ─────────────────────────────────────────────────────────────

const HIGH_RISK_PENALTY = 20;
const HIGH_RISK_PENALTY_CAP = 60;
const LIMITED_RISK_PENALTY = 8;
const LIMITED_RISK_PENALTY_CAP = 24;
const BIO_BONUS = 5;

function criterion(key: CriterionKey, status: 'good' | 'bad', detail: string): AnalysisCriterion {
  return { key, label: CRITERION_LABELS[key], status, detail };
}

function gradeFor(score: number): 'bon' | 'moyen' | 'mauvais' | 'tres_mauvais' {
  if (score >= 75) return 'bon';
  if (score >= 50) return 'moyen';
  if (score >= 25) return 'mauvais';
  return 'tres_mauvais';
}

/**
 * Analyse un cosmétique Open Beauty Facts normalisé :
 * score /100 + classe + liste de qualités et de défauts fondés
 * sur la composition INCI et les labels. Score null si la
 * composition est absente de la base OBF.
 */
export function analyzeCosmeticProduct(product: CosmeticProduct): ProductAnalysis {
  const positives: AnalysisCriterion[] = [];
  const negatives: AnalysisCriterion[] = [];

  const infos = ingredientsInfos(product.ingredients);
  const highRisk = infos.filter((i) => i.risk === 'a_risque');
  const limitedRisk = infos.filter((i) => i.risk === 'risque_limite');
  const hasComposition = infos.length > 0;

  // ── Ingrédients à risque ──────────────────────────────────
  if (hasComposition) {
    if (highRisk.length + limitedRisk.length > 0) {
      const parts: string[] = [];
      if (highRisk.length > 0) parts.push(`${highRisk.length} à fort risque`);
      if (limitedRisk.length > 0) parts.push(`${limitedRisk.length} à risque limité`);
      negatives.push(criterion('ingredients', 'bad', parts.join(' · ')));
    } else {
      positives.push(criterion('ingredients', 'good', 'Aucun ingrédient controversé'));
    }
  }

  // ── Parfum & allergènes ───────────────────────────────────
  const allergens = infos.filter((i) => i.allergen && !isParfumTag(i.code));
  const hasParfum = product.ingredients.some(isParfumTag);
  if (hasComposition && !hasParfum && allergens.length === 0) {
    positives.push(criterion('parfum', 'good', 'Sans parfum'));
  } else if (hasParfum) {
    negatives.push(criterion('parfum', 'bad', 'Contient du parfum'));
  }
  if (allergens.length > 0) {
    const names = allergens
      .slice(0, 3)
      .map((a) => a.name.replace(/ \(.*\)$/, ''))
      .join(', ');
    const more = allergens.length > 3 ? ` +${allergens.length - 3}` : '';
    negatives.push(criterion('allergenes', 'bad', `${allergens.length} allergène${allergens.length > 1 ? 's' : ''} (${names}${more})`));
  }

  // ── Labels ────────────────────────────────────────────────
  if (product.isBio) {
    positives.push(criterion('bio', 'good', 'Cosmétique bio'));
  }
  if (product.isNatural) {
    positives.push(criterion('naturel', 'good', 'Origine naturelle certifiée'));
  }
  if (product.isVegan) {
    positives.push(criterion('vegan', 'good', 'Vegan / non testé sur les animaux'));
  }
  if (product.palmFree) {
    positives.push(criterion('palme', 'good', 'Sans huile de palme'));
  }

  // ── Score ─────────────────────────────────────────────────
  let score: number | null = null;
  if (hasComposition) {
    const penalty =
      Math.min(HIGH_RISK_PENALTY_CAP, highRisk.length * HIGH_RISK_PENALTY) +
      Math.min(LIMITED_RISK_PENALTY_CAP, limitedRisk.length * LIMITED_RISK_PENALTY);
    score = Math.max(0, Math.min(100, 100 - penalty + (product.isBio ? BIO_BONUS : 0)));
  }

  return {
    score,
    grade: score === null ? 'inconnu' : gradeFor(score),
    positives,
    negatives,
  };
}
