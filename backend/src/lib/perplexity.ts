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
