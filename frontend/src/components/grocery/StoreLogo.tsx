import { STORE_LABELS } from '../../types';
import { cn } from '../../lib/utils';

// Logos SVG (fond transparent) servis depuis frontend/public/logos/.
const LOGO_PATHS: Record<string, string> = {
  maxi: '/logos/maxi.svg',
  iga: '/logos/iga.svg',
  costco: '/logos/costco.svg',
  jean_coutu: '/logos/jean-coutu.svg',
  pharmaprix: '/logos/pharmaprix.svg',
};

interface StoreLogoProps {
  /** Clé magasin d'un GroceryItem (voir STORE_LABELS). */
  store?: string | null;
  /** Hauteur de rendu (défaut h-4), la largeur suit les proportions. */
  className?: string;
}

/** Logo du magasin d'un item — rien si absent ou inconnu. */
export function StoreLogo({ store, className }: StoreLogoProps) {
  if (!store || !(store in LOGO_PATHS)) return null;
  return (
    <img
      src={LOGO_PATHS[store]}
      alt={STORE_LABELS[store] ?? store}
      title={STORE_LABELS[store] ?? store}
      className={cn('h-4 w-auto shrink-0', className)}
    />
  );
}
