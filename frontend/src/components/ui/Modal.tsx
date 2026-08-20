import { ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsDesktop } from '../../hooks/useIsDesktop';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Largeur maximale personnalisée (par défaut pleine largeur mobile). */
  size?: 'default' | 'wide';
}

/**
 * Bottom-sheet / modale plein écran, mobile-first.
 * Se ferme via le bouton X, le clic hors-zone, ou la touche Échap.
 *
 * Sur desktop (≥ 1024px), le contenu s'affiche dans le side panel droit
 * (`#modal-panel-root`, cf. DesktopPanel) au lieu de recouvrir l'écran :
 * pas de backdrop, le scroll de la page reste libre. Si le panneau est
 * absent (page sans modale, resize…), on retombe sur l'overlay classique.
 */
export function Modal({ open, onClose, title, children, footer, size = 'default' }: ModalProps) {
  const isDesktop = useIsDesktop();
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);

  // Résolution du panneau avant paint : évite tout flash d'overlay au
  // premier montage d'une page ouvrant directement une modale via l'URL.
  useLayoutEffect(() => {
    setPanel(open ? (document.getElementById('modal-panel-root') as HTMLDivElement | null) : null);
  }, [open]);

  // Le panneau est rendu même masqué en CSS (display:none < 1024px) : on
  // combine sa présence avec la media query pour choisir le mode d'affichage.
  const inPanel = isDesktop && panel !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Verrou du scroll body : uniquement en mode overlay — sur desktop la
    // page reste consultable à côté du panneau.
    if (!inPanel) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, inPanel]);

  if (!open) return null;

  // ── Desktop : contenu intégré au side panel, sans backdrop ──────────────
  if (inPanel && panel) {
    return createPortal(
      <div className="absolute inset-0 z-10 flex flex-col bg-stone-50">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
          <h2 className="truncate text-base font-bold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {footer && <div className="shrink-0 border-t border-stone-200 bg-white px-4 py-3">{footer}</div>}
      </div>,
      panel,
    );
  }

  // ── Mobile : bottom-sheet / overlay plein écran ─────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-stone-50 shadow-soft sm:rounded-2xl',
          // Tablette (≥ 768px) : modale élargie pour profiter de la largeur.
          size === 'wide' ? 'sm:max-w-lg md:max-w-3xl' : 'sm:max-w-app md:max-w-2xl',
        )}
      >
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-stone-200 bg-white px-4 py-3">
          <h2 className="truncate text-base font-bold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

        {footer && (
          <div className="border-t border-stone-200 bg-white px-4 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
