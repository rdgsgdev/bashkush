import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, PackageOpen, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CRITERION_DESCRIPTIONS, GRADE_LABELS, GRADE_STYLES } from '../../types/analysis';
import type { AnalysisCriterion } from '../../types/analysis';
import {
  RISK_BADGE_STYLES,
  RISK_DOT_STYLES,
  RISK_LABELS,
  additivesInfos,
  classifyByRisk,
  getAdditiveInfo,
} from '../../lib/additives';
import type { AdditiveInfo } from '../../lib/additives';
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
  /** Tags additifs normalisés (« e250 », « e951 »…). Absent des anciennes
      entrées d'historique avant enrichissement via Open Food Facts :
      la carte additifs ne se déplie que lorsqu'il est renseigné. */
  additives?: string[] | null;
}

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductDetailView | null;
}

/** Vue interne de la modale : produit → liste des additifs → fiche additif. */
type ModalView = { name: 'product' } | { name: 'additives' } | { name: 'additive'; code: string };

/** Ligne standard : verdict + description courte (« Trop gras »…) + détail. */
function CriterionRow({ criterion, good }: { criterion: AnalysisCriterion; good: boolean }) {
  const description = CRITERION_DESCRIPTIONS[criterion.key][criterion.status];
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-800">{criterion.label}</p>
        <p className="text-xs text-stone-400">{description}</p>
      </div>
      <span className="shrink-0 text-xs text-stone-500">{criterion.detail}</span>
    </li>
  );
}

/**
 * Ligne « Additifs » dépliable : au clic, la card révèle le classement
 * des additifs par niveau de risque (à risque → limité → sans risque)
 * et un lien vers la liste détaillée (fiches par additif).
 */
function AdditivesRow({
  criterion,
  infos,
  expanded,
  onToggle,
  onMoreInfos,
}: {
  criterion: AnalysisCriterion;
  infos: AdditiveInfo[];
  expanded: boolean;
  onToggle: () => void;
  onMoreInfos: () => void;
}) {
  const groups = classifyByRisk(infos);
  return (
    <li className="py-1">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-2 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <X className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800">{criterion.label}</p>
          <p className="text-xs text-stone-400">{CRITERION_DESCRIPTIONS.additifs.bad}</p>
        </div>
        <span className="shrink-0 text-xs text-stone-500">{criterion.detail}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-stone-400 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="space-y-2 pb-3 pl-9 pr-1">
          {groups.map((g) => (
            <div key={g.risk} className="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2">
              <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', RISK_DOT_STYLES[g.risk])} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-stone-700">
                  {RISK_LABELS[g.risk]} · {g.items.length}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {g.items.map((a) => (
                    <span
                      key={a.code}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase',
                        RISK_BADGE_STYLES[a.risk],
                      )}
                    >
                      {a.code.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={onMoreInfos}
            className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-stone-100"
          >
            Plus d’infos sur les additifs
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}

/** Vue « liste des additifs » : groupes par risque, fiche au clic. */
function AdditivesView({ infos, onSelect }: { infos: AdditiveInfo[]; onSelect: (info: AdditiveInfo) => void }) {
  const groups = classifyByRisk(infos);
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-500">
        Les {infos.length} additifs de ce produit, classés par niveau de risque. Touche un additif
        pour afficher sa fiche détaillée.
      </p>
      {groups.map((g) => (
        <div key={g.risk} className="card !py-2">
          <p className="flex items-center gap-2 px-1 pt-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
            <span className={cn('h-2 w-2 rounded-full', RISK_DOT_STYLES[g.risk])} />
            {RISK_LABELS[g.risk]} · {g.items.length}
          </p>
          <ul className="divide-y divide-stone-100">
            {g.items.map((a) => (
              <li key={a.code}>
                <button
                  onClick={() => onSelect(a)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-stone-50"
                >
                  <span
                    className={cn(
                      'flex h-7 w-14 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase',
                      RISK_BADGE_STYLES[a.risk],
                    )}
                  >
                    {a.code.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800">{a.name}</p>
                    <p className="truncate text-xs text-stone-400">{a.func}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="px-1 text-[11px] leading-relaxed text-stone-400">
        Classification indicative établie à partir des évaluations publiques EFSA, ANSES et CIRC —
        elle ne remplace pas un avis médical.
      </p>
    </div>
  );
}

/** Vue « fiche additif » : identité, niveau de risque, description, risques. */
function AdditiveDetailView({ info }: { info: AdditiveInfo }) {
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <span
          className={cn(
            'flex h-12 w-16 shrink-0 items-center justify-center rounded-xl text-sm font-bold uppercase',
            RISK_BADGE_STYLES[info.risk],
          )}
        >
          {info.code.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight text-stone-800">{info.name}</p>
          <p className="mt-0.5 text-xs text-stone-400">{info.func}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
            RISK_BADGE_STYLES[info.risk],
          )}
        >
          {RISK_LABELS[info.risk]}
        </span>
      </div>

      <div className="card">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Description</p>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{info.description}</p>
      </div>

      {info.risks.length > 0 && (
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide text-red-500">Risques potentiels</p>
          <ul className="mt-2 space-y-2">
            {info.risks.map((risk) => (
              <li key={risk} className="flex items-start gap-2 text-sm leading-relaxed text-stone-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Détail d'une analyse produit : en-tête (image, nom, marque, score /100
 * coloré) puis qualités et défauts basés sur les 8 critères — chacun
 * assorti d'une description courte. La ligne « Additifs » se déplie
 * (classement par risque) et mène à la liste détaillée puis aux fiches
 * individuelles ; la flèche retour navigue dans la modale sans la fermer.
 */
export function ProductDetailModal({ open, onClose, product }: ProductDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  // Navigation interne + état du dépliage de la carte additifs.
  const [view, setView] = useState<ModalView>({ name: 'product' });
  const [additivesExpanded, setAdditivesExpanded] = useState(false);

  // Changement de produit (nouvelle ouverture) → retenter son image et
  // revenir à la vue principale, carte additifs refermée.
  useEffect(() => {
    setImgFailed(false);
    setView({ name: 'product' });
    setAdditivesExpanded(false);
  }, [product]);

  if (!product) return null;

  const style = GRADE_STYLES[product.grade];
  // Fiches des additifs du produit (vide si tags non disponibles).
  const infos = product.additives ? additivesInfos(product.additives) : [];
  const selectedInfo = view.name === 'additive' ? getAdditiveInfo(view.code) : null;

  const goBack = () =>
    setView((v) => (v.name === 'additive' ? { name: 'additives' } : { name: 'product' }));

  const title =
    view.name === 'additives'
      ? 'Additifs'
      : view.name === 'additive'
        ? (selectedInfo?.name ?? 'Additif')
        : 'Analyse du produit';

  return (
    <Modal open={open} onClose={onClose} onBack={view.name !== 'product' ? goBack : undefined} title={title}>
      {view.name === 'product' && (
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
                {product.negatives.map((c) =>
                  // Ligne additifs dépliable uniquement si les tags sont
                  // disponibles (nouveau scan ou historique enrichi).
                  c.key === 'additifs' && infos.length > 0 ? (
                    <AdditivesRow
                      key={c.key}
                      criterion={c}
                      infos={infos}
                      expanded={additivesExpanded}
                      onToggle={() => setAdditivesExpanded((e) => !e)}
                      onMoreInfos={() => setView({ name: 'additives' })}
                    />
                  ) : (
                    <CriterionRow key={c.key} criterion={c} good={false} />
                  ),
                )}
              </ul>
            ) : (
              <p className="px-1 py-3 text-sm text-stone-400">Aucun défaut détecté</p>
            )}
          </div>
        </div>
      )}

      {view.name === 'additives' && (
        <AdditivesView infos={infos} onSelect={(a) => setView({ name: 'additive', code: a.code })} />
      )}

      {view.name === 'additive' && selectedInfo && <AdditiveDetailView info={selectedInfo} />}
    </Modal>
  );
}
