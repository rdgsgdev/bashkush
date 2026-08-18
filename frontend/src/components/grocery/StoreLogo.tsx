import type { ReactNode } from 'react';
import { useOptionList } from '../../hooks/useOptionList';
import { cn } from '../../lib/utils';

// Logos SVG (fond transparent) servis depuis frontend/public/logos/ —
// utilisés pour les magasins historiques sans logo uploadé.
const LOGO_PATHS: Record<string, string> = {
  maxi: '/logos/maxi.svg',
  iga: '/logos/iga.svg',
  costco: '/logos/costco.svg',
  jean_coutu: '/logos/jean-coutu.svg',
  pharmaprix: '/logos/pharmaprix.svg',
};

interface StoreLogoProps {
  /** Clé magasin d'un GroceryItem (voir la liste « store » des Paramètres). */
  store?: string | null;
  /** Logo uploadé (SVG/PNG, Supabase Storage) — magasins ajoutés via les Paramètres. */
  logoUrl?: string | null;
  /** Libellé de repli (alt/title) quand le magasin est hors des défauts. */
  label?: string;
  /** Hauteur de rendu (défaut h-4), la largeur suit les proportions. */
  className?: string;
  /** Rendu de repli quand aucun logo n'est résolu (ex: initiale). */
  fallback?: ReactNode;
}

/**
 * Logo du magasin d'un item — rien (ou `fallback`) si absent ou inconnu.
 * Logo uploadé (SVG/PNG, Paramètres) prioritaire, sinon SVG embarqué
 * pour les magasins historiques, sinon logo de la liste paramétrable.
 */
export function StoreLogo({ store, logoUrl, label, className, fallback }: StoreLogoProps) {
  const { options: storeOptions } = useOptionList('store');

  if (!store) return null;
  const dynamic = storeOptions.find((o) => o.value === store);
  const name = label ?? dynamic?.label ?? store;
  const src = logoUrl ?? dynamic?.logoUrl ?? (store in LOGO_PATHS ? LOGO_PATHS[store] : null);
  if (!src) return fallback ?? null;

  return (
    <img
      src={src}
      alt={name}
      title={name}
      className={cn('h-4 w-auto shrink-0', className)}
    />
  );
}
