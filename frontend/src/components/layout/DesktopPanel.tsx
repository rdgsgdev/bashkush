import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  PanelRight,
  ScanLine,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react';

/** Message d'attente du panneau, adapté à la page affichée au centre. */
const HINTS = [
  {
    path: '/meals',
    icon: UtensilsCrossed,
    title: 'Détails d’un plat',
    text: 'Sélectionnez un plat dans la liste pour afficher ses détails, le modifier ou le planifier.',
  },
  {
    path: '/calendar',
    icon: CalendarDays,
    title: 'Détails d’une planification',
    text: 'Sélectionnez un plat planifié pour afficher ses détails et suivre sa préparation étape par étape.',
  },
  {
    path: '/grocery',
    icon: ShoppingCart,
    title: 'Article de la liste',
    text: 'Sélectionnez un article pour le modifier (quantité, rayon, magasin…).',
  },
  {
    path: '/analyses',
    icon: ScanLine,
    title: 'Analyse d’un produit',
    text: 'Scannez un code-barres ou sélectionnez un produit de l’historique pour afficher son analyse détaillée.',
  },
];

/**
 * Side panel desktop (≥ 1024px), toujours ouvert : le contenu des modales
 * s'y affiche (via le portal `#modal-panel-root` du composant Modal) au lieu
 * de recouvrir l'écran. Masqué sur les pages sans modale (accueil, profil,
 * paramètres) : le contenu y prend toute la largeur.
 */
export function DesktopPanel() {
  const { pathname } = useLocation();

  const noPanel =
    pathname === '/' ||
    pathname.startsWith('/profil') ||
    pathname.startsWith('/parametres');
  if (noPanel) return null;

  const hint =
    HINTS.find((h) => pathname.startsWith(h.path)) ??
    ({ icon: PanelRight, title: 'Détails', text: 'Les détails s’afficheront ici.' } as const);
  const HintIcon = hint.icon;

  return (
    <aside className="hidden w-[400px] shrink-0 border-l border-stone-200 bg-stone-50 lg:flex xl:w-[420px]">
      {/* Racine des modales desktop ; l'état vide est recouvert dès
          qu'une modale s'y rend (fond opaque absolu sur tout le panneau). */}
      <div id="modal-panel-root" className="relative min-h-0 w-full">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card">
            <HintIcon className="h-5 w-5 text-stone-400" />
          </span>
          <div>
            <p className="text-sm font-bold text-stone-700">{hint.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">{hint.text}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
