import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import { queryPersisterOption } from './persist';
import { runOfflineAware } from '../offline/queue';
import type { AnalysisCriterion, ProductScan, ScanGrade } from '../types/analysis';

/**
 * Historique des produits analysés, offline-aware :
 * - lecture persistée IndexedDB (consultation hors ligne) ;
 * - l'enregistrement d'une analyse est mis en file si le serveur est
 *   injoignable puis rejoué à son retour ;
 * - update optimiste : le scan apparaît immédiatement en haut de
 *   l'historique (l'upsert par code-barres remplace l'éventuelle
 *   entrée existante).
 */

export async function fetchScanHistory(): Promise<ProductScan[]> {
  const { data } = await api.get<ProductScan[]>('/product-scans');
  return data;
}

/** Historique de la famille, trié par date de dernier scan. */
export function useScanHistory() {
  return useQuery({
    queryKey: queryKeys.productScans,
    queryFn: fetchScanHistory,
    persister: queryPersisterOption,
  });
}

export interface SaveProductScanInput {
  /** UUID généré côté client : rend le rejeu offline idempotent. */
  id: string;
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  score?: number | null;
  grade: ScanGrade;
  positives: AnalysisCriterion[];
  negatives: AnalysisCriterion[];
}

export async function saveProductScan(input: SaveProductScanInput): Promise<ProductScan> {
  const now = new Date().toISOString();
  // Réponse synthétique si la requête est mise en file offline.
  const scan: ProductScan = {
    id: input.id,
    barcode: input.barcode,
    name: input.name,
    brand: input.brand ?? null,
    imageUrl: input.imageUrl ?? null,
    score: input.score ?? null,
    grade: input.grade,
    positives: input.positives,
    negatives: input.negatives,
    scannedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return runOfflineAware({
    method: 'post',
    url: '/product-scans',
    body: input,
    invalidates: [['productScans']],
    label: `Analyser « ${input.name} »`,
    synthetic: () => scan,
    request: async () => {
      const { data } = await api.post<ProductScan>('/product-scans', input);
      return data;
    },
  });
}

/** Enregistre une analyse avec update optimiste de l'historique. */
export function useSaveProductScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveProductScan,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.productScans });
      const snap = qc.getQueryData<ProductScan[]>(queryKeys.productScans);
      const optimistic: ProductScan = {
        id: input.id,
        barcode: input.barcode,
        name: input.name,
        brand: input.brand ?? null,
        imageUrl: input.imageUrl ?? null,
        score: input.score ?? null,
        grade: input.grade,
        positives: input.positives,
        negatives: input.negatives,
        scannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Upsert local : un re-scan remplace l'ancienne entrée du même produit.
      qc.setQueryData<ProductScan[]>(queryKeys.productScans, [
        optimistic,
        ...(snap ?? []).filter((s) => s.barcode !== input.barcode),
      ]);
      return { snap };
    },
    // Rollback seulement en cas d'erreur réelle du serveur (pas en offline :
    // la réponse synthétique fait réussir la mutation, l'entrée est en file).
    onError: (_err, _input, ctx) => {
      if (ctx?.snap) qc.setQueryData(queryKeys.productScans, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.productScans });
    },
  });
}

/** Supprime une entrée de l'historique (avec update optimiste). */
export function useDeleteProductScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scan: ProductScan) => {
      return runOfflineAware({
        method: 'delete',
        url: `/product-scans/${scan.id}`,
        invalidates: [['productScans']],
        label: `Supprimer « ${scan.name} »`,
        synthetic: () => scan,
        request: async () => {
          await api.delete(`/product-scans/${scan.id}`);
          return scan;
        },
      });
    },
    onMutate: async (scan) => {
      await qc.cancelQueries({ queryKey: queryKeys.productScans });
      const snap = qc.getQueryData<ProductScan[]>(queryKeys.productScans);
      qc.setQueryData<ProductScan[]>(
        queryKeys.productScans,
        (snap ?? []).filter((s) => s.id !== scan.id),
      );
      return { snap };
    },
    onError: (_err, _scan, ctx) => {
      if (ctx?.snap) qc.setQueryData(queryKeys.productScans, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.productScans });
    },
  });
}
