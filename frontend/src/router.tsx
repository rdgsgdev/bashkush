import { ReactNode, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MealsPage } from './pages/MealsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GroceryListPage } from './pages/GroceryListPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/authStore';
import { useProfile } from './api/profile';
import { loadAiMealSession } from './lib/aiMealSession';
import type { Profile } from './types/profile';

function FullscreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-50">
      <p className="text-sm font-semibold text-brand-700">Chargement…</p>
    </div>
  );
}

/**
 * Reprise d'une génération IA en cours au chargement de l'app : redirection
 * directe vers « Mes plats » avec la modale ouverte — même comportement que
 * si l'app n'avait jamais été quittée. Ne fait rien sinon.
 */
function AiSessionResumeGate() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadAiMealSession(user.id)
      .then((session) => {
        if (cancelled || !session?.activeJob) return;
        // Une modale est déjà demandée par l'URL → on ne la remplace pas.
        const search = new URLSearchParams(location.search);
        const modalAlreadyOpen = ['meal', 'editchoice', 'mealai', 'details', 'plan'].some(
          (key) => search.get(key),
        );
        if (modalAlreadyOpen) return;
        const target =
          session.mode === 'edit' && session.mealId
            ? `?mealai=${encodeURIComponent(session.mealId)}`
            : '?meal=ai';
        navigate(`/meals${target}`, { replace: true });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Une seule tentative par chargement de l'app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
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
      <AiSessionResumeGate />
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
        <Route path="/parametres" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
