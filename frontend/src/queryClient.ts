import { QueryClient } from '@tanstack/react-query';

// Client Query partagé (créé ici pour être importable hors composants —
// notamment par la file de synchronisation offline qui doit invalider les
// requêtes après un rejeu réussi).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
