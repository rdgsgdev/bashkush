import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BUCKET: z.string().default('meals-images'),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  // ── Génération de plats par IA (Perplexity) ───────────────
  // Clé absente → l'endpoint /api/ai/generate-meal répond 503.
  PERPLEXITY_API_KEY: z.string().default(''),
  PERPLEXITY_MODEL: z.string().default('sonar'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables d’environnement invalides ou manquantes :');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

/** Origines autorisées pour le CORS (séparées par des virgules). */
export const corsOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean);
