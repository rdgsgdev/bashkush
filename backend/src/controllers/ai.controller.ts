// ── Génération de plats par IA (Perplexity Sonar) ────────────
// Le plat généré n'est PAS persisté ici : il est renvoyé au
// frontend (format CreateMealInput) qui l'affiche et ne l'enregistre
// que si l'utilisateur le valide (bouton « Enregistrer »).

import { z } from 'zod';
import type { Profile } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { ensureFamilyId } from '../lib/family';
import { computeDailyTargets } from '../lib/nutrition';
import { slugify } from '../lib/id';
import { perplexityChatJSON, fetchIngredientNutritionFromSonar } from '../lib/perplexity';
import {
  generateMealRequestSchema,
  GenerateMealRequest,
  ingredientNutritionQuerySchema,
} from '../schemas/ai.schema';
import { difficultyEnum, categoryEnum, CreateMealInput } from '../schemas/meal.schema';
import type { Response } from 'express';

// ── Listes fermées (miroir des options du frontend) ──────────

const UNITS = [
  'g', 'kg', 'ml', 'L', 'c. à soupe', 'c. à café', 'pièce',
  'bouquet', 'gousse', 'tranche', 'boîte', 'tasse',
] as const;

const AISLES = [
  'fruits_legumes', 'proteines', 'feculents', 'cremerie', 'epicerie_seche',
  'conserves', 'surgelas', 'boissons', 'epices_condiments',
] as const;

// ── Libellés FR des enums du profil ──────────────────────────

const GOAL_LABELS: Record<string, string> = {
  perdre_poids: 'perdre du poids',
  maintenir_poids: 'maintenir son poids',
  prendre_poids: 'prendre du poids',
  masse_musculaire: 'prise de masse musculaire',
  condition_physique: 'améliorer sa condition physique',
  autre: 'autre objectif',
};

const MEDICAL_LABELS: Record<string, string> = {
  diabete: 'diabète',
  hypertension: 'hypertension',
  cholesterol: 'cholestérol',
  allergies: 'allergies',
  autre: 'autre',
};

const FOOD_LABELS: Record<string, string> = {
  fruits: 'fruits',
  legumes: 'légumes',
  cereales_completes: 'céréales complètes',
  proteines_maigres: 'protéines maigres',
  produits_laitiers: 'produits laitiers',
  noix_graines: 'noix et graines',
  legumineuses: 'légumineuses',
  autre: 'autre',
};

const MEAL_FREQUENCY_LABELS: Record<string, string> = {
  '3_repas': '3 repas par jour',
  '4_6_repas': '4 à 6 repas par jour',
  jeune_intermittent: 'jeûne intermittent',
  autre: 'autre',
};

// ── Schéma JSON attendu de l'IA (structured outputs) ─────────
// Tous les champs sont requis et typés simplement (le modèle met
// 0 ou chaîne vide quand l'info n'a pas de sens) ; la
// normalisation en null/undefined se fait côté serveur ensuite.

const mealJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name', 'description', 'servings', 'prepTime', 'cookTime', 'totalTime',
    'difficulty', 'category', 'nutrition', 'notes', 'ingredients', 'steps',
  ],
  properties: {
    name: {
      type: 'string',
      description:
        'Nom de plat original, comme sur une carte de restaurant — très court (2 à 4 mots, ex : « Le marin croquant »), ' +
        'évoquant la composition ; sans type générique du plat (« Bol », « Salade »…) ni liste d’ingrédients',
    },
    description: { type: 'string', description: 'Description en 1-2 phrases (peut être vide)' },
    servings: { type: 'integer', description: 'Nombre de portions total de la recette' },
    prepTime: { type: 'integer', description: 'Temps de préparation en minutes (0 si inconnu)' },
    cookTime: { type: 'integer', description: 'Temps de cuisson en minutes (0 si aucun)' },
    totalTime: { type: 'integer', description: 'Temps total en minutes' },
    difficulty: { type: 'string', enum: ['facile', 'moyen', 'difficile'] },
    category: { type: 'string', enum: ['midi', 'soir', 'collation', 'autre'] },
    nutrition: {
      type: 'object',
      additionalProperties: false,
      required: ['calories', 'protein', 'carbs', 'fat', 'fiber'],
      description: 'Apports nutritionnels PAR portion',
      properties: {
        calories: { type: 'number', description: 'kcal par portion' },
        protein: { type: 'number', description: 'grammes de protéines par portion' },
        carbs: { type: 'number', description: 'grammes de glucides par portion' },
        fat: { type: 'number', description: 'grammes de lipides par portion' },
        fiber: { type: 'number', description: 'grammes de fibres par portion' },
      },
    },
    notes: { type: 'string', description: 'Conseils, astuces (peut être vide)' },
    ingredients: {
      type: 'array',
      description: 'Ingrédients pour le nombre total de portions',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'unit', 'aisle', 'optional', 'notes', 'nutrition'],
        properties: {
          name: { type: 'string', description: 'Nom de l’ingrédient en français' },
          quantity: { type: 'number', description: 'Quantité totale pour toutes les portions' },
          unit: { type: 'string', enum: [...UNITS] },
          aisle: { type: 'string', enum: [...AISLES], description: 'Rayon d’épicerie' },
          optional: { type: 'boolean' },
          notes: { type: 'string', description: 'Précision (peut être vide)' },
          nutrition: {
            type: 'object',
            additionalProperties: false,
            required: ['calories', 'protein', 'carbs', 'fat', 'fiber'],
            description: 'Apports TOTAUX de cet ingrédient pour la quantité indiquée (toutes portions)',
            properties: {
              calories: { type: 'number', description: 'kcal totaux de l’ingrédient' },
              protein: { type: 'number', description: 'grammes de protéines totaux' },
              carbs: { type: 'number', description: 'grammes de glucides totaux' },
              fat: { type: 'number', description: 'grammes de lipides totaux' },
              fiber: { type: 'number', description: 'grammes de fibres totaux' },
            },
          },
        },
      },
    },
    steps: {
      type: 'array',
      description: 'Étapes numérotées à partir de 1',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['stepNumber', 'instruction', 'time'],
        properties: {
          stepNumber: { type: 'integer' },
          instruction: { type: 'string', description: 'Instruction claire et complète' },
          time: { type: 'integer', description: 'Durée de l’étape en minutes (0 si non pertinent)' },
        },
      },
    },
  },
} as const;

// ── Validation de la réponse IA ──────────────────────────────

const aiMealResponseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000),
  servings: z.number().int().min(1).max(50),
  prepTime: z.number().int().nonnegative(),
  cookTime: z.number().int().nonnegative(),
  totalTime: z.number().int().nonnegative(),
  difficulty: difficultyEnum,
  category: categoryEnum,
  nutrition: z.object({
    calories: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    fiber: z.number().nonnegative(),
  }),
  notes: z.string().max(2000),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number(),
        unit: z.string().trim().min(1).max(30),
        aisle: z.string().trim().min(1).max(60),
        optional: z.boolean(),
        notes: z.string().max(300),
        // Apports totaux de l'ingrédient pour sa quantité (optionnel :
        // tolérant si l'IA omet, bien que le schéma strict les exige).
        nutrition: z
          .object({
            calories: z.number().nonnegative(),
            protein: z.number().nonnegative(),
            carbs: z.number().nonnegative(),
            fat: z.number().nonnegative(),
            fiber: z.number().nonnegative(),
          })
          .optional(),
      }),
    )
    .min(1),
  steps: z.array(
    z.object({
      stepNumber: z.number().int().nonnegative(),
      instruction: z.string().trim().min(1).max(1000),
      time: z.number().int().nonnegative(),
    }),
  ),
});

// ── Construction du prompt ───────────────────────────────────

const listOr = (values: string[] | null | undefined, labels: Record<string, string>): string =>
  values?.length ? values.map((v) => labels[v] ?? v).join(', ') : '';

/** Objectifs quotidiens : valeurs manuelles si présentes, sinon Mifflin-St Jeor. */
function memberTargets(profile: Profile): { calories: number | null; protein: number | null } {
  if (profile.targetsManual) {
    return { calories: profile.dailyCalories, protein: profile.dailyProtein };
  }
  const computed = computeDailyTargets(profile);
  if (computed) return { calories: computed.dailyCalories, protein: computed.dailyProtein };
  return { calories: profile.dailyCalories, protein: profile.dailyProtein };
}

/** Fiche lisible d'un membre, injectée dans le prompt. */
function memberFiche(profile: Profile): string {
  const name = profile.fullName?.trim() || 'Membre';
  const { calories, protein } = memberTargets(profile);
  const lines = [`- ${name} :`];

  if (calories || protein) {
    lines.push(
      `  Objectifs quotidiens : ${calories ? `≈ ${calories} kcal` : '?'}${
        protein ? ` et ≈ ${protein} g de protéines` : ''
      }`,
    );
  }
  const goals = listOr(profile.goals, GOAL_LABELS);
  if (goals) lines.push(`  Objectifs : ${goals}${profile.goalOther ? ` (${profile.goalOther})` : ''}`);
  if (profile.allergies?.trim()) lines.push(`  ⚠ Allergies : ${profile.allergies.trim()}`);
  const medical = listOr(profile.medicalConditions, MEDICAL_LABELS);
  if (medical) {
    lines.push(`  Conditions médicales : ${medical}${profile.medicalOther ? ` (${profile.medicalOther})` : ''}`);
  }
  const food = listOr(profile.foodChoices, FOOD_LABELS);
  if (food) lines.push(`  Préférences alimentaires : ${food}${profile.foodOther ? ` (${profile.foodOther})` : ''}`);
  if (profile.mealFrequency) {
    lines.push(
      `  Fréquence des repas : ${MEAL_FREQUENCY_LABELS[profile.mealFrequency] ?? profile.mealFrequency}${
        profile.mealFrequencyOther ? ` (${profile.mealFrequencyOther})` : ''
      }`,
    );
  }
  if (profile.notes?.trim()) lines.push(`  Notes : ${profile.notes.trim()}`);

  return lines.join('\n');
}

const SYSTEM_PROMPT = `Tu es un chef nutritionniste francophone. Tu crées des recettes équilibrées, réalistes et appétissantes, adaptées aux profils nutritionnels qu'on te fournit.

Règles impératives :
- Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni, sans texte autour.
- Toutes les quantités d'ingrédients sont pour le nombre TOTAL de portions demandé.
- Les apports nutritionnels (nutrition) sont PAR PORTION, avec des valeurs réalistes et cohérentes avec les ingrédients.
- Pour CHAQUE ingrédient, renseigne ses apports TOTAUX (nutrition de l'ingrédient) pour la quantité indiquée : la somme des apports de tous les ingrédients, divisée par le nombre de portions, doit correspondre aux apports par portion du plat.
- Les temps sont en minutes ; totalTime = prepTime + cookTime.
- Les unités doivent être choisies parmi : ${UNITS.join(', ')}.
- Le rayon (aisle) de chaque ingrédient doit être choisi parmi : ${AISLES.join(', ')}.
- Les étapes sont numérotées à partir de 1, claires et complètes (températures, quantités).
- NE JAMAIS inclure un ingrédient auquel un membre est allergique ; adapte la recette en conséquence.
- Les quantités doivent permettre à chaque membre de s'approcher de ses objectifs caloriques et protéiques pour sa part des portions.
- Convention de nommage : le nom est un nom de plat original, comme sur la carte d'un restaurant — très court (2 à 4 mots, article possible), ex : « Le marin croquant », « Aurore méditerranéenne », « Braise du sud-ouest ». Il évoque la composition du plat en lien direct ou indirect (ingrédient phare, origine culinaire, couleur, saison, ambiance). INTERDIT : mentionner le type ou le format générique du plat (« Bol », « Salade », « Curry », « Wrap », « Smoothie »…) et lister les ingrédients (ex : « Bol quinoa poulet avocat »).
- Les noms, ingrédients et instructions sont en français.`;

function buildUserPrompt(request: GenerateMealRequest, profiles: Profile[]): string {
  const sections: string[] = [];

  sections.push(`Membres pour lesquels générer le plat (données de leurs profils) :\n${profiles.map(memberFiche).join('\n')}`);

  const perMember = Math.round((request.servings / profiles.length) * 10) / 10;
  sections.push(
    `Nombre de portions total : ${request.servings}, réparti entre ${profiles.length} membre(s) → environ ${perMember} portion(s) par membre.`,
  );

  const constraints: string[] = [];
  if (request.difficulty) constraints.push(`Difficulté souhaitée : ${request.difficulty}.`);
  if (request.category) constraints.push(`Catégorie : ${request.category}.`);
  if (request.desiredIngredients?.length) {
    constraints.push(`Ingrédients souhaités (doivent apparaître dans la recette) : ${request.desiredIngredients.join(', ')}.`);
  }
  if (request.description?.trim()) constraints.push(`Description / consigne libre : ${request.description.trim()}`);
  sections.push(constraints.length ? constraints.join('\n') : 'Aucune contrainte supplémentaire.');

  if (request.previousMeal && request.feedback) {
    sections.push(
      `Plat actuel à modifier (JSON) :\n${JSON.stringify(request.previousMeal, null, 2)}\n\n` +
        `L'utilisateur demande la modification suivante : « ${request.feedback} »\n` +
        `Régénère le plat complet (même format JSON) en appliquant cette consigne, ` +
        `en conservant les éléments qui ne sont pas concernés par la modification.\n` +
        `ATTENTION : le nom ne fait pas partie des éléments à conserver tel quel — ` +
        `régénère-le selon la convention de nommage (nom original de restaurant, très court, ` +
        `sans type générique), en accord avec la composition modifiée du plat.`,
    );
  }

  return sections.join('\n\n');
}

// ── Normalisation de la réponse en CreateMealInput ───────────

/** 0 / chaîne vide → null ; ids d'ingrédients générés et uniques. */
function normalizeMeal(ai: z.infer<typeof aiMealResponseSchema>, servings: number): CreateMealInput {
  const usedIds = new Set<string>();
  const ingredients = ai.ingredients.map((ing) => {
    let id = slugify(ing.name);
    while (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);
    return {
      id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      aisle: ing.aisle,
      optional: ing.optional,
      notes: ing.notes.trim() || null,
      // Apports de l'ingrédient pour sa quantité — sert au recalcul
      // des apports par portion du plat quand les quantités évoluent.
      nutrition: ing.nutrition ? { ...ing.nutrition, quantity: ing.quantity } : undefined,
    };
  });

  return {
    name: ai.name,
    description: ai.description.trim() || null,
    // On impose les portions demandées (peu importe ce que l'IA renvoie).
    servings,
    prepTime: ai.prepTime || null,
    cookTime: ai.cookTime || null,
    totalTime: ai.totalTime || null,
    difficulty: ai.difficulty,
    category: ai.category,
    nutrition: {
      calories: ai.nutrition.calories,
      protein: ai.nutrition.protein,
      carbs: ai.nutrition.carbs,
      fat: ai.nutrition.fat,
      fiber: ai.nutrition.fiber,
    },
    notes: ai.notes.trim() || null,
    ingredients,
    steps: ai.steps.map((step, index) => ({
      stepNumber: index + 1,
      instruction: step.instruction,
      time: step.time || null,
    })),
  };
}

// ── Contrôleur ───────────────────────────────────────────────

/** POST /api/ai/generate-meal — génère (ou régénère) un plat adapté aux profils sélectionnés. */
export const generateMeal = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const request = generateMealRequestSchema.parse(req.body) as GenerateMealRequest;

  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);

  // Seuls les profils de MA famille sont acceptés.
  const profiles = await prisma.profile.findMany({
    where: { familyId, userId: { in: request.memberIds } },
  });
  if (profiles.length === 0) throw new HttpError(404, 'Aucun membre valide sélectionné');

  const meal = await perplexityChatJSON<unknown>({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(request, profiles),
    schemaName: 'meal',
    jsonSchema: mealJsonSchema as unknown as Record<string, unknown>,
  });

  const parsed = aiMealResponseSchema.safeParse(meal);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Réponse IA non conforme :', parsed.error.flatten().fieldErrors);
    throw new HttpError(502, 'Le plat généré par l’IA est incomplet, réessaie');
  }

  res.json({ meal: normalizeMeal(parsed.data, request.servings) });
});

// ── Complétion des apports d'un ingrédient (ajout manuel) ────

/**
 * POST /api/ai/ingredient-nutrition — apports d'un ingrédient pour une
 * quantité donnée, complétés par Sonar. Utilisé par la modale d'édition
 * d'un plat lors de l'ajout/modification manuelle d'un ingrédient.
 */
export const getIngredientNutrition = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, quantity, unit } = ingredientNutritionQuerySchema.parse(req.body);
  const nutrition = await fetchIngredientNutritionFromSonar(name, quantity, unit);
  res.json({ nutrition });
});
