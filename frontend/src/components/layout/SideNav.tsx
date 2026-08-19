import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  UtensilsCrossed,
  CalendarDays,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
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

/**
 * Menu latéral desktop (≥ 1024px), toujours visible et entièrement vert :
 * remplace le burger mobile. Repliable en mode icônes seules (état persisté
 * dans le cache) via le bouton révélé au survol, à mi-hauteur du menu.
 * La carte « Mon profil » est blanche pour ressortir sur le fond vert.
 */
export function SideNav() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
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

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const itemClass = (active: boolean) =>
    cn(
      'flex w-full items-center rounded-xl text-sm font-semibold transition',
      collapsed ? 'justify-center py-3' : 'gap-3 px-4 py-3',
      active
        ? 'bg-white/15 text-white'
        : 'text-white/70 hover:bg-white/10 hover:text-white',
    );

  return (
    <aside
      className={cn(
        'group relative hidden shrink-0 flex-col bg-brand-500 transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* En-tête : logo horizontal déplié, monogramme blanc replié (2rem) */}
      <div className="flex h-24 shrink-0 items-center justify-center overflow-hidden px-3">
        <img
          src={collapsed ? '/logo_white.svg' : '/logo_horizontal_white.svg'}
          alt="Bashkush"
          className="h-8 w-auto max-w-full object-contain"
        />
      </div>

      {/* Replier / déplier : révélé au survol du menu (ou au focus clavier),
          posé sur le bord droit à mi-hauteur. `pointer-events-none` masqué :
          la zone ne vole aucun clic sur le contenu quand le bouton est invisible. */}
      <button
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
        className="absolute -right-3 top-1/2 z-40 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 opacity-0 shadow-card transition hover:text-brand-600 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
      >
        {collapsed ? (
          <ChevronsRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronsLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Navigation principale (badges façon burger mobile) */}
      <ul className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
        {NAV.map(({ to, label, icon: Icon }) => {
          const badge = badges[to] ?? 0;
          const active = isActive(to);
          return (
            <li key={to}>
              <button onClick={() => navigate(to)} title={collapsed ? label : undefined} className={itemClass(active)}>
                <span className="relative">
                  <Icon className="h-5 w-5 shrink-0" />
                  {collapsed && badge > 0 && (
                    <span className="absolute -right-2.5 -top-2 rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-brand-600">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                {!collapsed && label}
                {!collapsed && badge > 0 && (
                  <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Bas de menu : paramètres, déconnexion, profil (carte blanche) */}
      <div className="space-y-1 border-t border-white/15 p-3">
        <button
          onClick={() => navigate('/parametres')}
          title={collapsed ? 'Paramètres' : undefined}
          className={itemClass(location.pathname === '/parametres')}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && 'Paramètres'}
        </button>
        <button
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          title={collapsed ? 'Déconnexion' : undefined}
          className={itemClass(false)}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && 'Déconnexion'}
        </button>

        {/* Carte profil blanche : ressort sur le fond vert du menu.
            Repliée : pastille blanche réduite à la photo. */}
        <button
          onClick={() => navigate('/profil')}
          title={collapsed ? profile?.fullName || 'Mon profil' : undefined}
          className={cn(
            'mt-2 flex w-full items-center rounded-xl bg-white text-left text-sm font-semibold text-stone-800 shadow-card transition hover:bg-stone-50',
            collapsed ? 'justify-center p-1.5' : 'gap-3 p-2',
            location.pathname === '/profil' && 'ring-2 ring-white',
          )}
        >
          {profile?.photoUrl && !photoFailed ? (
            <img
              src={profile.photoUrl}
              alt="Photo de profil"
              onError={() => setPhotoFailed(true)}
              className="h-10 w-10 shrink-0 rounded-full border-2 border-brand-100 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
              {(profile?.fullName || user?.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="max-w-full truncate text-sm font-semibold text-stone-800">
                {profile?.fullName || 'Mon profil'}
              </span>
              {user?.email && (
                <span className="max-w-full truncate text-xs font-normal text-stone-500">
                  {user.email}
                </span>
              )}
            </div>
          )}
        </button>
        {!collapsed && (
          <p className="pt-1 text-center text-xs text-white/50">Bashkush · v1.0</p>
        )}
      </div>
    </aside>
  );
}
