// ── Client Perplexity (API Sonar, format OpenAI-compatible) ──
// Utilisé pour la génération de plats par IA. La clé est stockée
// côté serveur uniquement (jamais exposée au frontend).

import { env } from '../config/env';
import { HttpError } from '../middleware/error';

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const TIMEOUT_MS = 90_000;

interface PerplexityChatOptions {
  system: string;
  user: string;
  /** Nom du schéma JSON attendu en réponse (structured outputs). */
  schemaName: string;
  /** Schéma JSON décrivant l'objet attendu. */
  jsonSchema: Record<string, unknown>;
}

/** La génération IA est-elle configurée (clé API présente) ? */
export function isPerplexityEnabled(): boolean {
  return env.PERPLEXITY_API_KEY.length > 0;
}

/**
 * Extrait le premier objet JSON d'une réponse texte : gère le JSON
 * brut, les fences ```json et le texte parasite autour.
 */
function extractJSON(content: string): string {
  const trimmed = content.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // On continue : la réponse n'est pas du JSON pur.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      JSON.parse(fenced[1]);
      return fenced[1];
    } catch {
      // Fence illisible : on tente l'extraction par bornes.
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    try {
      JSON.parse(slice);
      return slice;
    } catch {
      // Illisible également.
    }
  }

  throw new HttpError(502, 'La réponse de l’IA est illisible');
}

/**
 * Appelle Perplexity et retourne la réponse parsée en objet JSON,
 * conformément au schéma fourni (response_format json_schema).
 */
export async function perplexityChatJSON<T>({
  system,
  user,
  schemaName,
  jsonSchema,
}: PerplexityChatOptions): Promise<T> {
  if (!isPerplexityEnabled()) {
    throw new HttpError(503, 'La génération par IA n’est pas configurée (clé Perplexity absente)');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new HttpError(504, 'La génération par IA a pris trop de temps');
    }
    throw new HttpError(502, 'Impossible de contacter l’IA de génération');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error(`Perplexity API ${response.status}: ${await response.text().catch(() => '')}`);
    throw new HttpError(502, 'Erreur côté l’IA de génération');
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new HttpError(502, 'Réponse vide de l’IA de génération');
  }

  return JSON.parse(extractJSON(content)) as T;
}

// ── Complétion des apports d'un ingrédient (ajout manuel) ────

/** Apports d'un ingrédient pour une quantité donnée (valeurs totales, pas par portion). */
export interface SonarNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

const ingredientNutritionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['calories', 'protein', 'carbs', 'fat', 'fiber'],
  properties: {
    calories: { type: 'number', description: 'kcal totaux pour la quantité demandée' },
    protein: { type: 'number', description: 'grammes de protéines totaux' },
    carbs: { type: 'number', description: 'grammes de glucides totaux' },
    fat: { type: 'number', description: 'grammes de lipides totaux' },
    fiber: { type: 'number', description: 'grammes de fibres totaux' },
  },
} as const;

/**
 * Interroge Sonar pour obtenir les apports d'un ingrédient pour une quantité
 * donnée. Retourne les valeurs TOTALES pour cette quantité (à stocker telles
 * quelles, avec la quantité courante comme référence).
 */
export async function fetchIngredientNutritionFromSonar(
  name: string,
  quantity: number,
  unit: string,
): Promise<SonarNutrition> {
  const result = await perplexityChatJSON<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>({
    system: [
      'Tu es une base de données nutritionnelle (type table Ciqual).',
      'Pour l’ingrédient et la quantité exactement demandés, renvoie les apports TOTAUX',
      '(kcal et grammes) pour cette quantité, avec des valeurs moyennes fiables pour',
      "l'aliment cru non préparé. Si la quantité est en volume ou en unités (pièce,",
      'c. à soupe…), estime la masse équivalente. Si tu ne connais pas l’aliment,',
      'renvoie des valeurs nulles (0).',
    ].join(' '),
    user: `Ingrédient : « ${name} » — quantité : ${quantity} ${unit}.`,
    schemaName: 'ingredient_nutrition',
    jsonSchema: ingredientNutritionJsonSchema as unknown as Record<string, unknown>,
  });

  // Valeurs forcément positives (0 si l'IA renvoie du bruit négatif).
  const round1 = (v: number) => Math.round(Math.max(0, v) * 10) / 10;
  return {
    calories: Math.round(Math.max(0, result.calories)),
    protein: round1(result.protein),
    carbs: round1(result.carbs),
    fat: round1(result.fat),
    fiber: round1(result.fiber),
  };
}
