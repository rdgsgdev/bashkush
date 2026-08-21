import { useEffect, useState } from 'react';
import { Check, PackageOpen, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { GRADE_LABELS, GRADE_STYLES } from '../../types/analysis';
import type { AnalysisCriterion } from '../../types/analysis';
import { cn } from '../../lib/utils';

/** Vue minimale partagée par la modale de détail (card historique / scan). */
export interface ProductDetailView {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  score: number | null;
  grade: keyof typeof GRADE_LABELS;
  positives: AnalysisCriterion[];
  negatives: AnalysisCriterion[];
}

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductDetailView | null;
}

function CriterionRow({ criterion, good }: { criterion: AnalysisCriterion; good: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white',
          good ? 'bg-emerald-500' : 'bg-red-500',
        )}
      >
        {good ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
      <span className="flex-1 text-sm font-semibold text-stone-800">{criterion.label}</span>
      <span className="shrink-0 text-xs text-stone-500">{criterion.detail}</span>
    </li>
  );
}

/**
 * Détail d'une analyse produit : en-tête (image, nom, marque, score /100
 * coloré) puis qualités et défauts basés sur les 8 critères.
 */
export function ProductDetailModal({ open, onClose, product }: ProductDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  // Changement de produit (nouvelle ouverture) → retenter son image.
  useEffect(() => {
    setImgFailed(false);
  }, [product]);
  if (!product) return null;

  const style = GRADE_STYLES[product.grade];

  return (
    <Modal open={open} onClose={onClose} title="Analyse du produit">
      <div className="space-y-4">
        {/* En-tête produit */}
        <div className="card flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">
            {product.imageUrl && !imgFailed ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                onError={() => setImgFailed(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-300">
                <PackageOpen className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight text-stone-800">{product.name}</p>
            {product.brand && <p className="mt-0.5 truncate text-sm text-stone-400">{product.brand}</p>}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center gap-4">
          <div
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full text-white shadow-card',
              style.badgeBg,
            )}
          >
            <span className="text-2xl font-extrabold">{product.score ?? '—'}</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold leading-none">{product.score ?? '—'}</p>
            <p className={cn('mt-1 text-sm font-bold', style.label)}>
              / 100 · {GRADE_LABELS[product.grade]}
            </p>
            {product.score === null && (
              <p className="mt-1 max-w-44 text-xs text-stone-400">
                Données nutritionnelles insuffisantes pour noter ce produit
              </p>
            )}
          </div>
        </div>

        {/* Qualités */}
        <div className="card !py-2">
          <p className="px-1 pt-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600">
            Qualités
          </p>
          {product.positives.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {product.positives.map((c) => (
                <CriterionRow key={c.key} criterion={c} good />
              ))}
            </ul>
          ) : (
            <p className="px-1 py-3 text-sm text-stone-400">Aucune qualité détectée</p>
          )}
        </div>

        {/* Défauts */}
        <div className="card !py-2">
          <p className="px-1 pt-1.5 text-xs font-bold uppercase tracking-wide text-red-500">
            Défauts
          </p>
          {product.negatives.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {product.negatives.map((c) => (
                <CriterionRow key={c.key} criterion={c} good={false} />
              ))}
            </ul>
          ) : (
            <p className="px-1 py-3 text-sm text-stone-400">Aucun défaut détecté</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
