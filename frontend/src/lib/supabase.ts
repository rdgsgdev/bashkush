import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non définis — la connexion sera indisponible. Copiez .env.example en .env si besoin.',
  );
}

/** Client Supabase côté navigateur (clé anon) — utilisé uniquement pour Auth. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // gère le retour de redirect OAuth (apple / google)
  },
});
