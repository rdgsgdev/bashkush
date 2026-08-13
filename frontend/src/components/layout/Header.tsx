import { Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { useUiStore } from '../../store/uiStore';

interface HeaderProps {
  /** Titre texte (ignoré si `logo` est fourni). */
  title?: string;
  subtitle?: string;
  /** Si fourni, remplace le titre/sous-titre par ce logo inline. */
  logo?: string;
  /** Actions à droite (bouton ajouter, etc.). */
  action?: ReactNode;
  /** Masquer le bouton burger (par défaut visible). */
  showBurger?: boolean;
}

export function Header({ title, subtitle, logo, action, showBurger = true }: HeaderProps) {
  const openBurger = useUiStore((s) => s.openBurger);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
      {showBurger && (
        <button
          onClick={openBurger}
          className="rounded-lg p-1.5 text-stone-600 transition hover:bg-stone-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {logo ? (
          <img src={logo} alt="Bashkush" className="h-8 w-auto" />
        ) : (
          <>
            <h1 className="truncate text-lg font-bold leading-tight text-stone-800">{title}</h1>
            {subtitle && <p className="truncate text-xs text-stone-500">{subtitle}</p>}
          </>
        )}
      </div>
      {action}
    </header>
  );
}
