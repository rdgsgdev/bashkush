import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { queryClient } from './queryClient';
import { ensureCacheOwner } from './api/persist';
import { initConnection } from './offline/connection';
import { LiveSyncInitializer } from './realtime/LiveSyncInitializer';

/** Restaure la session au chargement puis suit les changements d'état d'auth. */
function AuthInitializer() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      // Purge le cache s'il appartient à un autre compte AVANT de débloquer
      // le rendu — sinon les requêtes restaureraient les données du compte
      // précédent depuis IndexedDB.
      if (data.session) await ensureCacheOwner(data.session.user.id);
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void ensureCacheOwner(session.user.id).finally(() => setSession(session));
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  return null;
}

/** Sonde santé (réveil proactif du serveur) + écoute online/offline. */
function ConnectionInitializer() {
  useEffect(() => {
    initConnection();
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer />
        <ConnectionInitializer />
        <LiveSyncInitializer />
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
