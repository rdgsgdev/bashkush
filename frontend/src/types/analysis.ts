// ── Analyse de produits (scan code-barres) ──────────────────
// Types partagés entre l'algorithme de score (lib/productAnalysis),
// l'API Open Food Facts (lib/openFoodFacts) et l'historique
// (model Prisma ProductScan, api/analyses).

/** Critères évalués sur un produit — chacun bascule en qualité ou en défaut selon sa teneur.
    Les clés `ingredients`, `parfum`, `allergenes`, `naturel` et `vegan` ne concernent
    que les cosmétiques (analyse Open Beauty Facts). */
export type CriterionKey =
  | 'additifs'
  | 'satures'
  | 'bio'
  | 'fruits_legumes'
  | 'fibres'
  | 'sodium'
  | 'calories'
  | 'sucres'
  | 'proteines'
  | 'nova'
  | 'palme'
  | 'ecoscore'
  | 'ingredients'
  | 'parfum'
  | 'allergenes'
  | 'naturel'
  | 'vegan';

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  additifs: 'Additifs',
  satures: 'Graisses saturées',
  bio: 'Bio',
  fruits_legumes: 'Fruits & Légumes',
  fibres: 'Fibres',
  sodium: 'Sodium',
  calories: 'Calories',
  sucres: 'Sucres',
  proteines: 'Protéines',
  nova: 'Transformation',
  palme: 'Huile de palme',
  ecoscore: 'Éco-Score',
  ingredients: 'Ingrédients',
  parfum: 'Parfum',
  allergenes: 'Allergènes',
  naturel: 'Naturel',
  vegan: 'Vegan',
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
  proteines: { good: 'Bonne source de protéines', bad: 'Peu de protéines' },
  nova: { good: 'Peu transformé', bad: 'Ultra-transformé' },
  palme: { good: 'Sans huile de palme', bad: 'Huile de palme présente' },
  ecoscore: { good: 'Faible impact environnemental', bad: 'Impact environnemental élevé' },
  ingredients: { good: 'Aucun ingrédient controversé', bad: 'Ingrédients controversés' },
  parfum: { good: 'Sans parfum', bad: 'Contient du parfum' },
  allergenes: { good: 'Sans allergène déclaré', bad: 'Allergènes à déclaration obligatoire' },
  naturel: { good: 'Origine naturelle', bad: 'Origine naturelle non certifiée' },
  vegan: { good: 'Vegan, non testé sur les animaux', bad: 'Composition non vegan' },
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
  /** null → données insuffisantes pour noter. */
  score: number | null;
  grade: ScanGrade;
  positives: AnalysisCriterion[];
  negatives: AnalysisCriterion[];
  /** true → nutriments incomplets, score estimé via le Nutri-Score
      officiel d'Open Food Facts (mention affichée dans le détail). */
  estimated?: boolean;
}

/** Type de produit scanné : alimentaire (Open Food Facts) ou cosmétique
    (Open Beauty Facts) — piloté par les critères et la modale de détail. */
export type ProductType = 'food' | 'cosmetic';

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
  /** Tags additifs (« e250 », « e951 »…) ou ingrédients INCI pour les
      cosmétiques (« phenoxyethanol »…). Absent des entrées créées avant
      l'ajout du champ → enrichi à l'ouverture via Open Food Facts. */
  additives?: string[] | null;
  /** Absent des anciennes entrées → considéré alimentaire. */
  productType?: ProductType;
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
  /** Nombre d'additifs déclaré par OFF (null si champ absent) : 0 = « sans
      additifs » avéré, liste vide sans compteur = donnée manquante. */
  additivesN: number | null;
  /** % estimé de fruits/légumes/noix dans les ingrédients (null si absent). */
  fruitsVegetablesPct: number | null;
  /** Groupe NOVA 1–4 (1 = non transformé, 4 = ultra-transformé). */
  novaGroup: number | null;
  /** Nutri-Score officiel OFF « a »–« e » (repli de score si nutriments incomplets). */
  nutriscoreGrade: string | null;
  /** Éco-Score officiel OFF « a »–« e ». */
  ecoscoreGrade: string | null;
  /** Nombre d'ingrédients dérivés de l'huile de palme (null si inconnu). */
  palmOilCount: number | null;
  nutriments: {
    energyKcal: number | null;
    energyKj: number | null;
    sugars: number | null;
    saturatedFat: number | null;
    sodiumMg: number | null;
    fiber: number | null;
    proteins: number | null;
  };
}

/** Données brutes d'un cosmétique, normalisées depuis Open Beauty Facts. */
export interface CosmeticProduct {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  /** Slugs INCI normalisés, sans préfixe (« phenoxyethanol », « aqua »…). */
  ingredients: string[];
  /** Labels OBF souvent absents → false = non détecté (≠ affirmé absent). */
  isBio: boolean;
  isVegan: boolean;
  isNatural: boolean;
  /** Label « sans huile de palme » explicite. */
  palmFree: boolean;
}
