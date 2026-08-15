import { ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MealsPage } from './pages/MealsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GroceryListPage } from './pages/GroceryListPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/authStore';
import { useProfile } from './api/profile';
import type { Profile } from './types/profile';

function FullscreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-50">
      <p className="text-sm font-semibold text-brand-700">Chargement…</p>
    </div>
  );
}

/** Vrai si l'onboarding est terminé (profil existant avec onboardedAt). */
function useOnboarded() {
  const { data: profile, isLoading } = useProfile();
  const onboarded = Boolean((profile as Profile | undefined)?.onboardedAt);
  return { onboarded, profileLoading: isLoading };
}

/** Pages principales : session + onboarding requis (header + burger). */
function ProtectedLayout() {
  const session = useAuthStore((s) => s.session);
  const authLoading = useAuthStore((s) => s.loading);
  const { onboarded, profileLoading } = useOnboarded();

  if (authLoading || profileLoading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/** Onboarding : plein écran, réservé aux utilisateurs non onboardés. */
function OnboardingGuard() {
  const session = useAuthStore((s) => s.session);
  const authLoading = useAuthStore((s) => s.loading);
  const { onboarded, profileLoading } = useOnboarded();

  if (authLoading || profileLoading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (onboarded) return <Navigate to="/" replace />;

  return <OnboardingPage />;
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
      <Route path="/onboarding" element={<OnboardingGuard />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/grocery" element={<GroceryListPage />} />
        <Route path="/profil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
