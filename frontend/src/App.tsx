import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { queryClient } from './queryClient';
import { initConnection } from './offline/connection';
import { LiveSyncInitializer } from './realtime/LiveSyncInitializer';

/** Restaure la session au chargement puis suit les changements d'état d'auth. */
function AuthInitializer() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));

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
