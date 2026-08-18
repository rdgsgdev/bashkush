import { Home, UtensilsCrossed, CalendarDays, ShoppingCart, Settings, LogOut } from 'lucide-react';
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
      <nav className="absolute left-0 top-0 flex h-full w-[78%] max-w-xs flex-col bg-white shadow-soft">
        <div className="flex h-24 items-center justify-start bg-brand-500">
          <img src="/logo-menu.png" alt="Bashkush" className="h-full w-auto object-contain" />
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
                    active ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {badges[to] > 0 && (
                    <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {badges[to]}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-stone-100 px-3 py-3">
          <button
            onClick={() => {
              // TODO: naviguer vers /parametres quand la page existera.
              close();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-100"
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
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-100"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
          <button
            onClick={() => go('/profil')}
            className={cn(
              'mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition',
              location.pathname === '/profil' ? 'bg-brand-600' : 'bg-brand-500 hover:bg-brand-600',
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
                <span className="max-w-full truncate text-xs font-normal text-white/80">
                  {user.email}
                </span>
              )}
            </div>
          </button>
          <p className="px-2 pt-2 text-xs text-stone-400">Bashkush · v1.0</p>
        </div>
      </nav>
    </div>,
    document.body,
  );
}
