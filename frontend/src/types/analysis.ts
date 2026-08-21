// ── Analyse de produits (scan code-barres) ──────────────────
// Types partagés entre l'algorithme de score (lib/productAnalysis),
// l'API Open Food Facts (lib/openFoodFacts) et l'historique
// (model Prisma ProductScan, api/analyses).

/** Critères évalués sur un produit — chacun bascule en qualité ou en défaut selon sa teneur. */
export type CriterionKey =
  | 'additifs'
  | 'satures'
  | 'bio'
  | 'fruits_legumes'
  | 'fibres'
  | 'sodium'
  | 'calories'
  | 'sucres';

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  additifs: 'Additifs',
  satures: 'Graisses saturées',
  bio: 'Bio',
  fruits_legumes: 'Fruits & Légumes',
  fibres: 'Fibres',
  sodium: 'Sodium',
  calories: 'Calories',
  sucres: 'Sucres',
};

/** Description courte affichée sous chaque critère du détail (ex: « Trop
    gras », « Peu de sodium ») — dérivée du couple critère / verdict. */
export const CRITERION_DESCRIPTIONS: Record<CriterionKey, { good: string; bad: string }> = {
  additifs: { good: 'Sans additifs', bad: 'Additifs présents' },
  satures: { good: 'Peu de graisses saturées', bad: 'Trop gras' },
  bio: { good: 'Faible impact environnemental', bad: 'Impact environnemental' },
  fruits_legumes: { good: 'Bonne quantité', bad: 'Trop peu de fruits et légumes' },
  fibres: { good: 'Bonne quantité de fibres', bad: 'Trop peu de fibres' },
  sodium: { good: 'Peu de sodium', bad: 'Trop salé' },
  calories: { good: 'Faible apport calorique', bad: 'Trop calorique' },
  sucres: { good: 'Peu de sucres', bad: 'Trop sucré' },
};

/** Un critère évalué : verdict + détail lisible (« 12 g / 100 g », « 2 additifs dont 1 à risque »). */
export interface AnalysisCriterion {
  key: CriterionKey;
  label: string;
  status: 'good' | 'bad';
  detail: string;
}

/** Classe du score /100 (style Yuka). `inconnu` = données nutritionnelles insuffisantes. */
export type ScanGrade = 'bon' | 'moyen' | 'mauvais' | 'tres_mauvais' | 'inconnu';

export const GRADE_LABELS: Record<ScanGrade, string> = {
  bon: 'Bon',
  moyen: 'Moyen',
  mauvais: 'Mauvais',
  tres_mauvais: 'Très mauvais',
  inconnu: 'Inconnu',
};

/** Styles par grade (pastille score des cards et cercle du détail). */
export const GRADE_STYLES: Record<ScanGrade, { badgeBg: string; badgeText: string; label: string }> = {
  bon: { badgeBg: 'bg-emerald-500', badgeText: 'text-emerald-600', label: 'text-emerald-600' },
  moyen: { badgeBg: 'bg-amber-500', badgeText: 'text-amber-600', label: 'text-amber-600' },
  mauvais: { badgeBg: 'bg-red-500', badgeText: 'text-red-600', label: 'text-red-600' },
  tres_mauvais: { badgeBg: 'bg-red-700', badgeText: 'text-red-700', label: 'text-red-700' },
  inconnu: { badgeBg: 'bg-stone-400', badgeText: 'text-stone-500', label: 'text-stone-500' },
};

/** Résultat complet d'une analyse, calculé côté client (lib/productAnalysis). */
export interface ProductAnalysis {
  /** null → données nutritionnelles insuffisantes pour noter. */
  score: number | null;
  grade: ScanGrade;
  positives: AnalysisCriterion[];
  negatives: AnalysisCriterion[];
}

/** Entrée d'historique (model Prisma ProductScan). */
export interface ProductScan {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  score: number | null;
  grade: ScanGrade;
  positives: AnalysisCriterion[];
  negatives: AnalysisCriterion[];
  /** Tags additifs (« e250 », « e951 »…). Absent des entrées créées avant
      l'ajout du champ → enrichi à l'ouverture via Open Food Facts. */
  additives?: string[] | null;
  /** Date du dernier scan (ISO) — l'affichage utilise formatRelativeScanDate. */
  scannedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Données brutes d'un produit, normalisées depuis Open Food Facts (valeurs /100 g). */
export interface OffProduct {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  /** Boissons : seuils de points et de critères spécifiques (tables Nutri-Score). */
  isBeverage: boolean;
  isBio: boolean;
  /** Tags additifs normalisés (« e250 », « e951 »…). */
  additives: string[];
  /** % estimé de fruits/légumes/noix dans les ingrédients (null si absent). */
  fruitsVegetablesPct: number | null;
  nutriments: {
    energyKcal: number | null;
    energyKj: number | null;
    sugars: number | null;
    saturatedFat: number | null;
    sodiumMg: number | null;
    fiber: number | null;
  };
}
