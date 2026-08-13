import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Client Supabase côté serveur (clé service role).
 * Utilisé uniquement pour le Storage (upload/suppression des photos de plats).
 * Les données métier transitent par Prisma (Postgres direct).
 */
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

export const STORAGE_BUCKET = env.SUPABASE_BUCKET;
