import { ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MealsPage } from './pages/MealsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GroceryListPage } from './pages/GroceryListPage';
import { LoginPage } from './pages/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/authStore';

function FullscreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-50">
      <p className="text-sm font-semibold text-brand-700">Chargement…</p>
    </div>
  );
}

/** Bloque l'accès tant qu'aucune session Supabase n'est active. */
function ProtectedLayout() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/** Redirige vers l'accueil si déjà connecté. */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return <FullscreenLoader />;
  if (session) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/grocery" element={<GroceryListPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
