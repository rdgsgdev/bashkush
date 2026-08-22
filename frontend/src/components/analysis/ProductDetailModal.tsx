import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, PackageOpen, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CRITERION_DESCRIPTIONS, GRADE_LABELS, GRADE_STYLES } from '../../types/analysis';
import type { AnalysisCriterion, ProductType } from '../../types/analysis';
import {
  RISK_BADGE_STYLES,
  RISK_DOT_STYLES,
  RISK_LABELS,
  additivesInfos,
  classifyByRisk,
  getAdditiveInfo,
} from '../../lib/additives';
import type { AdditiveInfo } from '../../lib/additives';
import { getIngredientInfo, ingredientsInfos } from '../../lib/cosmetics';
import { cn } from '../../lib/utils';

/** Fiche affichée dans la vue composition : additif alimentaire ou
    ingrédient INCI cosmétique (mêmes champs, `allergen` en plus). */
type CompositionInfo = AdditiveInfo & { allergen?: boolean };

/** Vue minimale partagée par la modale de détail (card historique / scan). */
export interface ProductDetailView {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  score: number | null;
  grade: keyof typeof GRADE_LABELS;
  positives: AnalysisCriterion[];
  negatives: AnalysisCriterion[];
  /** Tags additifs (« e250 », « e951 »…) ou slugs INCI (« phenoxyethanol »…).
      Absent des anciennes entrées d'historique avant enrichissement via
      OFF/OBF : la carte composition ne se déplie que lorsqu'il est renseigné. */
  composition?: string[] | null;
  /** Piloté par le type : libellés, fiches et textes s'adaptent. */
  productType: ProductType;
  /** true → score estimé via le Nutri-Score officiel (alimentaire). */
  scoreEstimated?: boolean;
}

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductDetailView | null;
}

/** Vue interne de la modale : produit → composition → fiche détaillée. */
type ModalView = { name: 'product' } | { name: 'composition' } | { name: 'item'; code: string };

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

/** Additif E-numéroté (« e250 ») → pastille E-code, sinon nom INCI. */
function chipLabel(info: CompositionInfo): string {
  return /^e\d/.test(info.code) ? info.code.toUpperCase() : info.name;
}

/**
 * Ligne « Additifs » / « Ingrédients » dépliable : au clic, la card
 * révèle le classement par niveau de risque (à risque → limité → sans
 * risque) et un lien vers la liste détaillée (fiches individuelles).
 */
function CompositionRow({
  criterion,
  infos,
  expanded,
  onToggle,
  onMoreInfos,
  moreInfosLabel,
}: {
  criterion: AnalysisCriterion;
  infos: CompositionInfo[];
  expanded: boolean;
  onToggle: () => void;
  onMoreInfos: () => void;
  moreInfosLabel: string;
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
          <p className="text-xs text-stone-400">{CRITERION_DESCRIPTIONS[criterion.key].bad}</p>
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
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        RISK_BADGE_STYLES[a.risk],
                      )}
                    >
                      {chipLabel(a)}
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
            {moreInfosLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}

/** Vue « liste composition » : groupes par risque, fiche au clic. */
function CompositionView({
  infos,
  isCosmetic,
  onSelect,
}: {
  infos: CompositionInfo[];
  isCosmetic: boolean;
  onSelect: (info: CompositionInfo) => void;
}) {
  const groups = classifyByRisk(infos);
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-500">
        {isCosmetic
          ? `La composition de ce produit (${infos.length} ingrédients analysés), classée par niveau de risque. Touche un ingrédient pour afficher sa fiche détaillée.`
          : `Les ${infos.length} additifs de ce produit, classés par niveau de risque. Touche un additif pour afficher sa fiche détaillée.`}
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
                  {isCosmetic ? (
                    <span
                      className={cn(
                        'flex h-7 shrink-0 items-center justify-center rounded-lg px-2 text-[11px] font-bold',
                        RISK_BADGE_STYLES[a.risk],
                      )}
                    >
                      {RISK_LABELS[a.risk]}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'flex h-7 w-14 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase',
                        RISK_BADGE_STYLES[a.risk],
                      )}
                    >
                      {a.code.toUpperCase()}
                    </span>
                  )}
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
        {isCosmetic
          ? 'Classification indicative établie à partir des statuts réglementaires CosIng (Commission européenne) et des avis ANSES, ECHA et CIR — elle ne remplace pas un avis médical.'
          : 'Classification indicative établie à partir des évaluations publiques EFSA, ANSES et CIRC — elle ne remplace pas un avis médical.'}
      </p>
    </div>
  );
}

/** Pastille identité : E-code (additif) ou niveau de risque (ingrédient INCI). */
function IdentityBadge({ info, isCosmetic }: { info: CompositionInfo; isCosmetic: boolean }) {
  if (isCosmetic) {
    return (
      <span
        className={cn(
          'flex h-12 shrink-0 items-center justify-center rounded-xl px-3 text-[11px] font-bold',
          RISK_BADGE_STYLES[info.risk],
        )}
      >
        {RISK_LABELS[info.risk]}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex h-12 w-16 shrink-0 items-center justify-center rounded-xl text-sm font-bold uppercase',
        RISK_BADGE_STYLES[info.risk],
      )}
    >
      {info.code.toUpperCase()}
    </span>
  );
}

/** Vue « fiche » : identité, niveau de risque, description, risques. */
function CompositionItemView({ info, isCosmetic }: { info: CompositionInfo; isCosmetic: boolean }) {
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <IdentityBadge info={info} isCosmetic={isCosmetic} />
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

      {isCosmetic && info.allergen && (
        <div className="card flex items-center gap-2 !py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-stone-600">Allergène à déclaration obligatoire (UE)</p>
        </div>
      )}

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
 * Détail d'une analyse produit : en-tête (image, nom, marque, type,
 * score /100 coloré) puis qualités et défauts — chacun assorti d'une
 * description courte. La ligne « Additifs » (alimentaire) ou
 * « Ingrédients » (cosmétique) se déplie (classement par risque) et
 * mène à la liste détaillée puis aux fiches individuelles ; la flèche
 * retour navigue dans la modale sans la fermer.
 */
export function ProductDetailModal({ open, onClose, product }: ProductDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  // Navigation interne + état du dépliage de la carte composition.
  const [view, setView] = useState<ModalView>({ name: 'product' });
  const [compositionExpanded, setCompositionExpanded] = useState(false);

  // Changement de produit (nouvelle ouverture) → retenter son image et
  // revenir à la vue principale, carte composition refermée.
  useEffect(() => {
    setImgFailed(false);
    setView({ name: 'product' });
    setCompositionExpanded(false);
  }, [product]);

  if (!product) return null;

  const style = GRADE_STYLES[product.grade];
  const isCosmetic = product.productType === 'cosmetic';
  // Fiches de la composition du produit (vide si tags non disponibles).
  const infos: CompositionInfo[] = product.composition
    ? isCosmetic
      ? ingredientsInfos(product.composition)
      : additivesInfos(product.composition)
    : [];
  const selectedInfo =
    view.name === 'item'
      ? isCosmetic
        ? getIngredientInfo(view.code)
        : getAdditiveInfo(view.code)
      : null;

  const goBack = () =>
    setView((v) => (v.name === 'item' ? { name: 'composition' } : { name: 'product' }));

  const title =
    view.name === 'composition'
      ? isCosmetic
        ? 'Ingrédients'
        : 'Additifs'
      : view.name === 'item'
        ? (selectedInfo?.name ?? 'Composition')
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
              <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                {isCosmetic ? 'Cosmétique' : 'Alimentaire'}
              </span>
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
                  {isCosmetic
                    ? 'Composition indisponible pour noter ce produit'
                    : 'Données nutritionnelles insuffisantes pour noter ce produit'}
                </p>
              )}
              {product.scoreEstimated && product.score !== null && (
                <p className="mt-1 max-w-44 text-xs text-stone-400">
                  Estimation basée sur le Nutri-Score officiel Open Food Facts
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
                  // Ligne composition dépliable uniquement si les tags sont
                  // disponibles (nouveau scan ou historique enrichi).
                  (c.key === 'additifs' || c.key === 'ingredients') && infos.length > 0 ? (
                    <CompositionRow
                      key={c.key}
                      criterion={c}
                      infos={infos}
                      expanded={compositionExpanded}
                      onToggle={() => setCompositionExpanded((e) => !e)}
                      onMoreInfos={() => setView({ name: 'composition' })}
                      moreInfosLabel={isCosmetic ? 'Plus d’infos sur les ingrédients' : 'Plus d’infos sur les additifs'}
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

      {view.name === 'composition' && (
        <CompositionView
          infos={infos}
          isCosmetic={isCosmetic}
          onSelect={(a) => setView({ name: 'item', code: a.code })}
        />
      )}

      {view.name === 'item' && selectedInfo && (
        <CompositionItemView info={selectedInfo} isCosmetic={isCosmetic} />
      )}
    </Modal>
  );
}
