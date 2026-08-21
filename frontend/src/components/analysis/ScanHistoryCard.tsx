import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { GRADE_STYLES } from '../../types/analysis';
import type { ProductScan } from '../../types/analysis';
import { cn, formatRelativeScanDate } from '../../lib/utils';

interface ScanHistoryCardProps {
  scan: ProductScan;
  onOpen: (scan: ProductScan) => void;
  onDelete: (scan: ProductScan) => void;
}

/** Ligne d'historique : image, produit, marque, pastille score et date relative du scan. */
export function ScanHistoryCard({ scan, onOpen, onDelete }: ScanHistoryCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const style = GRADE_STYLES[scan.grade];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <button
        onClick={() => onOpen(scan)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:scale-[0.99]"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
          {scan.imageUrl && !imgFailed ? (
            <img
              src={scan.imageUrl}
              alt={scan.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800">{scan.name}</p>
          {scan.brand && <p className="truncate text-xs text-stone-400">{scan.brand}</p>}
          <p className="mt-0.5 text-xs text-stone-400">{formatRelativeScanDate(scan.scannedAt)}</p>
        </div>

        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
            style.badgeBg,
          )}
          aria-label={`Score ${scan.score ?? '—'} / 100`}
        >
          {scan.score ?? '—'}
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
      </button>

      <button
        onClick={() => onDelete(scan)}
        className="shrink-0 rounded-lg p-1.5 text-stone-300 transition hover:bg-red-50 hover:text-red-500"
        aria-label={`Retirer ${scan.name} de l'historique`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
