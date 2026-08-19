import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryClient } from '../queryClient';
import { clearCacheOwner, purgePersistedQueries } from '../api/persist';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),
  signOut: async () => {
    // La file d'actions offline est liée au compte : on la vide pour éviter
    // de rejouer des actions d'une famille avec la session d'un autre compte.
    const { clearQueue } = await import('../offline/queue');
    await clearQueue().catch(() => undefined);
    await supabase.auth.signOut();
    // Le cache de requêtes (mémoire + IndexedDB) est lié au compte aussi :
    // purge complète pour ne jamais afficher les données du compte
    // précédent à la connexion suivante (profil, famille, liste de courses…).
    queryClient.clear();
    await purgePersistedQueries();
    clearCacheOwner();
    set({ session: null, user: null });
  },
}));
