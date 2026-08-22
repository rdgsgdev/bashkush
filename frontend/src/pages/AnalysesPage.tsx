import { useRef, useState } from 'react';
import { History, ScanLine, SearchX } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PullToRefresh } from '../components/common/PullToRefresh';
import { EmptyState, ErrorState, FullScreenLoader } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { ScannerView } from '../components/analysis/ScannerView';
import { ScanHistoryCard } from '../components/analysis/ScanHistoryCard';
import { ProductDetailModal, type ProductDetailView } from '../components/analysis/ProductDetailModal';
import { useDeleteProductScan, useSaveProductScan, useScanHistory } from '../api/analyses';
import { getProduct } from '../lib/openFoodFacts';
import { resolveCosmeticProduct } from '../lib/cosmeticSources';
import { analyzeProduct } from '../lib/productAnalysis';
import { analyzeCosmeticProduct } from '../lib/cosmeticAnalysis';
import type { ProductScan } from '../types/analysis';
import { cn } from '../lib/utils';

// ── Analyse en cours ─────────────────────────────────────────
type PendingScan =
  | { status: 'analyzing'; barcode: string }
  | { status: 'notfound'; barcode: string }
  | { status: 'error'; barcode: string };

/**
 * Page d'analyse de produits (façon Yuka) :
 * - onglet Scanner : caméra prête à décoder un code-barres (ou photo de
 *   la galerie / saisie manuelle) → produit Open Food Facts, à défaut
 *   cosmétique Open Beauty Facts → analyse → détail + enregistrement
 *   dans l'historique de la famille ;
 * - onglet Historique : produits déjà analysés, du plus récent au plus
 *   ancien — un clic rouvre le détail de l'analyse.
 */
export function AnalysesPage() {
  const [tab, setTab] = useState<'scan' | 'historique'>('scan');
  const [pending, setPending] = useState<PendingScan | null>(null);
  const [detail, setDetail] = useState<ProductDetailView | null>(null);
  const detailOpen = detail !== null;
  // Séquence d'ouvertures : une réponse OFF lente ne doit enrichir que le
  // détail encore affiché (deux produits homonymes, fermeture rapide…).
  const detailSeq = useRef(0);

  const history = useScanHistory();
  const saveScan = useSaveProductScan();
  const deleteScan = useDeleteProductScan();

  // ── Flux de scan : décodage → OFF/OBF+OPF → analyse → sauvegarde ──
  async function handleBarcode(barcode: string) {
    setPending({ status: 'analyzing', barcode });
    try {
      // Alimentaire d'abord (Open Food Facts), puis cosmétique (Open
      // Beauty Facts, complété par Open Products Facts) si inconnu.
      const food = await getProduct(barcode);
      if (food) {
        const analysis = analyzeProduct(food);
        const saved = await saveScan.mutateAsync({
          id: crypto.randomUUID(),
          barcode,
          name: food.name,
          brand: food.brand,
          imageUrl: food.imageUrl,
          score: analysis.score,
          grade: analysis.grade,
          positives: analysis.positives,
          negatives: analysis.negatives,
          // Tags additifs (« e250 »…) : détaillés dans la modale de détail.
          additives: food.additives,
          productType: 'food',
        });
        setPending(null);
        openDetail({ ...saved, estimated: analysis.estimated });
        return;
      }

      const cosmetic = await resolveCosmeticProduct(barcode);
      if (cosmetic) {
        const analysis = analyzeCosmeticProduct(cosmetic);
        const saved = await saveScan.mutateAsync({
          id: crypto.randomUUID(),
          barcode,
          name: cosmetic.name,
          brand: cosmetic.brand,
          imageUrl: cosmetic.imageUrl,
          score: analysis.score,
          grade: analysis.grade,
          positives: analysis.positives,
          negatives: analysis.negatives,
          // Ingrédients INCI : détaillés dans la modale de détail.
          additives: cosmetic.ingredients,
          productType: 'cosmetic',
        });
        setPending(null);
        openDetail(saved);
        return;
      }

      setPending({ status: 'notfound', barcode });
    } catch {
      // Erreur réseau vers OFF/OBF/OPF (hors ligne, timeout…).
      setPending({ status: 'error', barcode });
    }
  }

  function openDetail(scan: ProductScan & { estimated?: boolean }) {
    const seq = ++detailSeq.current;
    setDetail({
      name: scan.name,
      brand: scan.brand,
      imageUrl: scan.imageUrl,
      score: scan.score,
      grade: scan.grade,
      positives: scan.positives,
      negatives: scan.negatives,
      composition: scan.additives ?? null,
      productType: scan.productType ?? 'food',
      scoreEstimated: scan.estimated,
    });
    // Anciennes entrées d'historique (avant le champ `additives`) : on
    // recharge le produit depuis la base adaptée pour récupérer les tags
    // — silencieusement ignoré hors ligne / produit retiré de la base.
    if (scan.additives == null) {
      void (async () => {
        try {
          const product =
            (scan.productType ?? 'food') === 'food'
              ? await getProduct(scan.barcode)
              : await resolveCosmeticProduct(scan.barcode);
          if (!product || seq !== detailSeq.current) return;
          const composition = 'additives' in product ? product.additives : product.ingredients;
          setDetail((d) => (d ? { ...d, composition } : d));
        } catch {
          // Hors ligne ou base injoignable : détail sans composition.
        }
      })();
    }
  }

  const scans = history.data ?? [];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header + onglets dans un même bloc sticky : la barre d'onglets
          reste visible sous le Header pendant le défilement. */}
      <div className="sticky top-0 z-30">
        <Header
          title="Analyses"
          subtitle="Scanne un produit pour analyser sa composition"
        />

        {/* Onglets — même barre que la liste de courses */}
        <div className="flex gap-1 border-b border-stone-200 bg-white px-4">
          {(['scan', 'historique'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative px-3 py-2.5 text-sm font-semibold transition',
                tab === t ? 'text-brand-600' : 'text-stone-400',
              )}
            >
              {t === 'scan' ? 'Scanner' : 'Historique'}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>
      </div>

      <PullToRefresh queryKeys={[['productScans']]}>
        <main className="flex-1 space-y-4 p-4 md:mx-auto md:w-full md:max-w-3xl">
          {/* ── Onglet Scanner ── */}
          {tab === 'scan' && (
            <>
              <ScannerView paused={pending !== null || detailOpen} onBarcode={handleBarcode} />

              {pending?.status === 'analyzing' && (
                <div className="card flex items-center justify-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-brand-500" />
                  <p className="text-sm font-medium text-stone-600">Analyse du produit…</p>
                </div>
              )}

              {pending?.status === 'notfound' && (
                <div className="card flex flex-col items-center gap-3 text-center">
                  <SearchX className="h-8 w-8 text-stone-400" />
                  <div>
                    <p className="font-semibold text-stone-700">Produit introuvable</p>
                    <p className="mt-1 text-sm text-stone-500">
                      Le code {pending.barcode} n'est dans aucune base connue : Open Food Facts
                      (alimentaire), Open Beauty Facts ni Open Products Facts (cosmétiques).
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setPending(null)}>
                    Scanner un autre produit
                  </Button>
                </div>
              )}

              {pending?.status === 'error' && (
                <>
                  <ErrorState message="Impossible de joindre les bases de produits (Open Food Facts / Open Beauty Facts). Vérifie ta connexion puis réessaie." />
                  <div className="flex justify-center">
                    <Button variant="secondary" onClick={() => handleBarcode(pending.barcode)}>
                      Réessayer
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Onglet Historique ── */}
          {tab === 'historique' && (
            <>
              {history.isLoading ? (
                <FullScreenLoader label="Chargement de l'historique…" />
              ) : history.isError && !history.data ? (
                <ErrorState />
              ) : scans.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Aucun produit analysé"
                  description="Les produits que tu scannes apparaissent ici, partagés avec ta famille."
                  action={
                    <Button onClick={() => setTab('scan')}>
                      <ScanLine className="h-4 w-4" /> Scanner un produit
                    </Button>
                  }
                />
              ) : (
                <div className="rounded-2xl bg-white shadow-card">
                  <ul className="divide-y divide-stone-100">
                    {scans.map((scan) => (
                      <li key={scan.id}>
                        <ScanHistoryCard
                          scan={scan}
                          onOpen={(s) => {
                            setTab('historique');
                            openDetail(s);
                          }}
                          onDelete={(s) => deleteScan.mutate(s)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </main>
      </PullToRefresh>

      <ProductDetailModal open={detailOpen} onClose={() => setDetail(null)} product={detail} />
    </div>
  );
}
