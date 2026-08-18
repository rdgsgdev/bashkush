// ── Types partagés (miroir des modèles Prisma du backend) ────

export type Difficulty = 'facile' | 'moyen' | 'difficile';
/**
 * Type de plat (nature de la recette — le moment du repas est sur la
 * planification). Liste paramétrable par famille (page Paramètres) : les
 * valeurs ci-dessous sont les défauts, mais `Meal.category` accepte toute
 * clé (catégories personnalisées ou retirées de la liste).
 */
export type Category =
  | 'bowl'
  | 'wrap'
  | 'salad'
  | 'soup'
  | 'sandwich'
  | 'pasta'
  | 'stir_fry'
  | 'dessert'
  | 'smoothie'
  | 'snack_food'
  | 'side'
  | 'main'
  | 'beverage';
/** Moment de consommation d'un repas planifié (liste paramétrable, défauts ci-dessous). */
export type MealType = 'petit_dejeuner' | 'brunch' | 'diner' | 'souper' | 'collation';
export type MealPlanStatus = 'a_faire' | 'en_preparation' | 'prepare';

/** Listes paramétrables de la famille (page Paramètres). */
export type ListKey = 'category' | 'unit' | 'store' | 'meal_type';

export interface ListOption {
  id: string;
  listKey: ListKey;
  value: string; // clé technique référencée par les données
  label: string; // libellé affiché
  sortOrder: number;
  logoUrl?: string | null; // logo du magasin (Supabase Storage) — stores uniquement
  logoPath?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Réglages IA de la famille (page Paramètres). */
export interface FamilySettings {
  aiMealGenerationEnabled: boolean;
  aiNutritionEnabled: boolean;
}

export interface Nutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

/** Apports d'un ingrédient : valeurs données pour `quantity` unités (défaut : sa quantité). */
export interface IngredientNutrition extends Nutrition {
  quantity?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  optional?: boolean;
  notes?: string | null;
  nutrition?: IngredientNutrition | null;
}

export interface Step {
  stepNumber: number;
  instruction: string;
  time?: number | null;
  ingredients?: string[] | null;
}

export interface Meal {
  id: string;
  familyId?: string; // visibilité : plats de la famille uniquement
  name: string;
  description?: string | null;
  servings: number;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  difficulty?: Difficulty | null;
  category?: string | null; // clé de la liste paramétrable (voir CATEGORY_LABELS pour les défauts)
  nutrition?: Nutrition | null;
  notes?: string | null;
  isFavorite: boolean;
  imageUrl?: string | null;
  imagePath?: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: Ingredient[];
  steps: Step[];
}

/** Format attendu par l'import JSON (champs optionnels). */
export interface MealDraft {
  id?: string;
  name: string;
  description?: string | null;
  servings?: number;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  difficulty?: Difficulty | null;
  category?: string | null;
  nutrition?: Nutrition | null;
  notes?: string | null;
  ingredients: Ingredient[];
  steps?: Step[];
}

export interface MealPlan {
  id: string;
  familyId?: string; // visibilité : planifications de la famille uniquement
  mealId: string;
  fromDate: string;
  toDate: string;
  servings: number;
  status: MealPlanStatus;
  /** Moment de consommation (liste paramétrable — voir MEAL_TYPE_LABELS pour les défauts). */
  mealType?: string | null;
  /** Numéros des étapes de préparation cochées — partagés entre membres. */
  completedSteps: number[];
  createdAt: string;
  updatedAt: string;
  meal: Meal;
  /** Ingrédients réellement envoyés en liste de courses (sélection utilisateur). */
  contributions?: Array<{ ingredientId: string; quantity: number }>;
}

export interface GroceryItem {
  id: string;
  familyId?: string; // visibilité : liste propre à chaque famille
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  position: number; // ordre manuel dans le rayon (égalité → tri alphabétique)
  store?: string | null; // magasin (clé de STORE_LABELS) — jamais rempli par la planification
  isManual: boolean;
  checked: boolean;
  archived: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryAisle {
  name: string;
  label?: string | null;
  sortOrder: number;
  isDefault: boolean;
}

export interface GroceryListResponse {
  items: GroceryItem[];
  aisles: GroceryAisle[];
}

// ── Libellés FR pour les enums ──────────────────────────────
// Les listes sont paramétrables (page Paramètres) : ces maps ne couvrent
// que les valeurs par défaut — les consommateurs replient sur la valeur
// brute quand la clé est inconnue (catégorie retirée / personnalisée).

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};

export const CATEGORY_LABELS: Record<string, string> = {
  bowl: 'Bowl',
  wrap: 'Wrap',
  salad: 'Salade',
  soup: 'Soupe',
  sandwich: 'Sandwich',
  pasta: 'Pâtes',
  stir_fry: 'Sauté',
  dessert: 'Dessert',
  smoothie: 'Smoothie',
  snack_food: 'Snack',
  side: 'Accompagnement',
  main: 'Plat principal',
  beverage: 'Boisson',
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  brunch: 'Brunch',
  diner: 'Dîner',
  souper: 'Souper',
  collation: 'Collation',
};

export const STATUS_LABELS: Record<MealPlanStatus, string> = {
  a_faire: 'À faire',
  en_preparation: 'En préparation',
  prepare: 'Préparé',
};

export const AISLE_LABELS: Record<string, string> = {
  fruits_legumes: 'Fruits & légumes',
  proteines: 'Protéines',
  feculents: 'Féculents',
  cremerie: 'Crèmerie',
  epicerie_seche: 'Épicerie sèche',
  conserves: 'Conserves',
  surgelas: 'Surgelés',
  boissons: 'Boissons',
  epices_condiments: 'Épices & condiments',
};

export const AISLE_OPTIONS = Object.keys(AISLE_LABELS);

// Magasins proposés pour un item (champ optionnel, choix manuel uniquement).
export const STORE_LABELS: Record<string, string> = {
  maxi: 'Maxi',
  iga: 'IGA',
  costco: 'Costco',
  jean_coutu: 'Jean Coutu',
  pharmaprix: 'Pharmaprix',
};
