import { Home, UtensilsCrossed, CalendarDays, ShoppingCart, ScanLine, Settings, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useMeals } from '../../api/meals';
import { useGrocery } from '../../api/grocery';
import { useProfile } from '../../api/profile';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/meals', label: 'Mes plats', icon: UtensilsCrossed },
  { to: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { to: '/grocery', label: 'Liste de courses', icon: ShoppingCart },
  { to: '/analyses', label: 'Analyses', icon: ScanLine },
];

export function BurgerMenu() {
  const open = useUiStore((s) => s.burgerOpen);
  const close = useUiStore((s) => s.closeBurger);
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Badges du menu : abonnements au cache React Query (offline-safe).
  const { data: meals } = useMeals();
  const { data: grocery } = useGrocery(false);
  const { data: profile } = useProfile();
  const [photoFailed, setPhotoFailed] = useState(false);

  const badges: Record<string, number> = {
    '/meals': meals?.length ?? 0,
    '/grocery': (grocery?.items ?? []).filter((it) => !it.checked).length,
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const go = (to: string) => {
    navigate(to);
    close();
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <nav className="absolute left-0 top-0 flex h-full w-[78%] max-w-xs flex-col bg-brand-500 shadow-soft">
        <div className="flex h-24 shrink-0 items-center justify-center px-3">
          <img src="/logo_horizontal_white.svg" alt="Bashkush" className="h-9 w-auto max-w-[85%] object-contain" />
        </div>
        <ul className="flex-1 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <li key={to}>
                <button
                  onClick={() => go(to)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                    active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {badges[to] > 0 && (
                    <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {badges[to]}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-white/15 px-3 py-3">
          <button
            onClick={() => {
              go('/parametres');
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10 hover:text-white',
              location.pathname === '/parametres' ? 'bg-white/15 text-white' : 'text-white/70',
            )}
          >
            <Settings className="h-5 w-5" />
            Paramètres
          </button>
          <button
            onClick={async () => {
              close();
              await signOut();
              navigate('/login');
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
          <button
            onClick={() => go('/profil')}
            className={cn(
              'mt-3 flex w-full items-center gap-3 rounded-xl bg-white/15 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/25',
              location.pathname === '/profil' && 'ring-2 ring-white',
            )}
          >
            {profile?.photoUrl && !photoFailed ? (
              <img
                src={profile.photoUrl}
                alt="Photo de profil"
                onError={() => setPhotoFailed(true)}
                className="h-10 w-10 shrink-0 rounded-full border-2 border-white/70 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {(profile?.fullName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="max-w-full truncate text-sm font-semibold text-white">
                {profile?.fullName || 'Mon profil'}
              </span>
              {user?.email && (
                <span className="max-w-full truncate text-xs font-normal text-white/70">
                  {user.email}
                </span>
              )}
            </div>
          </button>
          <p className="px-2 pt-2 text-xs text-white/50">Bashkush · v1.0</p>
        </div>
      </nav>
    </div>,
    document.body,
  );
}
