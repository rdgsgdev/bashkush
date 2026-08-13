import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

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
 */
export function Modal({ open, onClose, title, children, footer, size = 'default' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-stone-50 shadow-soft sm:rounded-2xl',
          size === 'wide' ? 'sm:max-w-lg' : 'sm:max-w-app',
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
