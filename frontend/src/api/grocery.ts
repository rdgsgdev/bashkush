import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import { queryPersisterOption } from './persist';
import { runOfflineAware } from '../offline/queue';
import { queryClient } from '../queryClient';
import type { GroceryAisle, GroceryItem, GroceryListResponse } from '../types';

/**
 * Liste de courses offline-aware :
 * - lectures persistées dans IndexedDB (consultation hors ligne) ;
 * - mutations mises en file quand le serveur est injoignable puis rejouées
 *   automatiquement à son retour (voir src/offline/queue.ts) ;
 * - mises à jour optimistes immédiatement visibles, annulées seulement en cas
 *   d'erreur réelle du serveur (pas quand l'action est mise en file).
 */

// ── Helpers de cache (partagés actifs/archivés) ───────────────

function findCachedItem(id: string): GroceryItem | undefined {
  for (const archived of [false, true]) {
    const cache = queryClient.getQueryData<GroceryListResponse>(queryKeys.grocery(archived));
    const item = cache?.items.find((it) => it.id === id);
    if (item) return item;
  }
  return undefined;
}

type GrocerySnapshots = {
  active?: GroceryListResponse;
  archived?: GroceryListResponse;
  aisles?: GroceryAisle[];
};

function snapshotCaches(qc: ReturnType<typeof useQueryClient>): GrocerySnapshots {
  return {
    active: qc.getQueryData<GroceryListResponse>(queryKeys.grocery(false)),
    archived: qc.getQueryData<GroceryListResponse>(queryKeys.grocery(true)),
    aisles: qc.getQueryData<GroceryAisle[]>(queryKeys.aisles),
  };
}

function restoreCaches(qc: ReturnType<typeof useQueryClient>, snap: GrocerySnapshots) {
  if (snap.active) qc.setQueryData(queryKeys.grocery(false), snap.active);
  if (snap.archived) qc.setQueryData(queryKeys.grocery(true), snap.archived);
  if (snap.aisles) qc.setQueryData(queryKeys.aisles, snap.aisles);
}

function updateBothCaches(
  qc: ReturnType<typeof useQueryClient>,
  fn: (items: GroceryItem[]) => GroceryItem[],
) {
  for (const archived of [false, true]) {
    const key = queryKeys.grocery(archived);
    const old = qc.getQueryData<GroceryListResponse>(key);
    if (old) qc.setQueryData<GroceryListResponse>(key, { ...old, items: fn(old.items) });
  }
}

/** Déplace des items entre les listes actif ↔ archivé (après archive/désarchivage). */
function moveItems(
  qc: ReturnType<typeof useQueryClient>,
  ids: string[],
  toArchived: boolean,
  uncheck = false,
) {
  const moved: GroceryItem[] = [];
  updateBothCaches(qc, (items) =>
    items.filter((it) => {
      if (ids.includes(it.id)) {
        moved.push(it);
        return false;
      }
      return true;
    }),
  );
  if (moved.length === 0) return;
  const targetKey = queryKeys.grocery(toArchived);
  const target = qc.getQueryData<GroceryListResponse>(targetKey);
  if (target) {
    qc.setQueryData<GroceryListResponse>(targetKey, {
      ...target,
      items: [
        ...target.items,
        ...moved.map((it) => ({
          ...it,
          archived: toArchived,
          ...(uncheck ? { checked: false } : {}),
        })),
      ],
    });
  }
}

// ── Fetchers ─────────────────────────────────────────────────

export async function fetchGrocery(archived = false): Promise<GroceryListResponse> {
  const { data } = await api.get<GroceryListResponse>('/grocery-items', { params: { archived } });
  return data;
}

export interface CreateGroceryItemInput {
  /** UUID généré côté client : rend le rejeu offline idempotent. */
  id: string;
  name: string;
  quantity?: number;
  unit: string;
  aisle: string;
  store?: string | null;
  notes?: string | null;
}

/** Position d'insertion d'un nouvel item : en bas de son rayon (max + 1). */
function nextPositionInCache(aisle: string): number {
  const active = queryClient.getQueryData<GroceryListResponse>(queryKeys.grocery(false));
  const positions = (active?.items ?? [])
    .filter((it) => it.aisle === aisle && !it.archived)
    .map((it) => it.position ?? -1); // ?? -1 : cache persisté antérieur au champ
  return (positions.length > 0 ? Math.max(...positions) : -1) + 1;
}

export async function createGroceryItem(input: CreateGroceryItemInput): Promise<GroceryItem> {
  const now = new Date().toISOString();
  const item: GroceryItem = {
    id: input.id,
    name: input.name,
    quantity: input.quantity ?? 1,
    unit: input.unit,
    aisle: input.aisle,
    // L'update optimiste du hook a déjà inséré l'item au cache → on réutilise
    // sa position (le calcul reste identique quel que soit l'ordre d'appel).
    position: findCachedItem(input.id)?.position ?? nextPositionInCache(input.aisle),
    store: input.store ?? null,
    isManual: true,
    checked: false,
    archived: false,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  return runOfflineAware({
    method: 'post',
    url: '/grocery-items',
    body: input,
    invalidates: [['grocery']],
    label: `Ajouter « ${input.name} »`,
    synthetic: () => item,
    request: async () => {
      const { data } = await api.post<GroceryItem>('/grocery-items', input);
      return data;
    },
  });
}

export async function updateGroceryItem(
  id: string,
  input: Partial<{ name: string; quantity: number; unit: string; aisle: string; store: string | null; notes: string | null; checked: boolean }>,
): Promise<GroceryItem> {
  const cached = findCachedItem(id);
  return runOfflineAware({
    method: 'put',
    url: `/grocery-items/${id}`,
    body: input,
    invalidates: [['grocery']],
    label: cached ? `Modifier « ${cached.name} »` : 'Modifier un article',
    synthetic: () => (cached ? ({ ...cached, ...input } as GroceryItem) : ({} as GroceryItem)),
    request: async () => {
      const { data } = await api.put<GroceryItem>(`/grocery-items/${id}`, input);
      return data;
    },
  });
}

export async function deleteGroceryItem(id: string): Promise<void> {
  const cached = findCachedItem(id);
  return runOfflineAware({
    method: 'delete',
    url: `/grocery-items/${id}`,
    invalidates: [['grocery']],
    label: cached ? `Supprimer « ${cached.name} »` : 'Supprimer un article',
    synthetic: () => undefined,
    request: async () => {
      await api.delete(`/grocery-items/${id}`);
    },
  });
}

export async function toggleCheckItem(id: string): Promise<GroceryItem> {
  // Valeur absolue (rejeu idempotent) : l'update optimiste du hook a déjà
  // basculé le cache au moment où ce fetcher s'exécute → la valeur lue est
  // la nouvelle valeur. Cache absent → bascule côté serveur.
  const cached = findCachedItem(id);
  const checked = cached?.checked;
  return runOfflineAware({
    method: 'patch',
    url: `/grocery-items/${id}/check`,
    body: { checked },
    invalidates: [['grocery']],
    label: cached ? `${checked ? 'Cocher' : 'Décocher'} « ${cached.name} »` : 'Cocher un article',
    synthetic: () => (cached ? { ...cached, checked: !!checked } : ({} as GroceryItem)),
    request: async () => {
      const { data } = await api.patch<GroceryItem>(`/grocery-items/${id}/check`, { checked });
      return data;
    },
  });
}

export async function archiveItems(mode: 'checked' | 'all', ids?: string[]): Promise<string[]> {
  // Snapshot des ids concernés au moment de l'action : le rejeu offline reste
  // déterministe même si la liste évolue côté serveur entre-temps.
  const active = queryClient.getQueryData<GroceryListResponse>(queryKeys.grocery(false));
  const snapshot =
    ids ??
    (active?.items ?? [])
      .filter((it) => (mode === 'checked' ? it.checked : true))
      .map((it) => it.id);
  return runOfflineAware({
    method: 'post',
    url: '/grocery-items/archive',
    body: { mode, ids: snapshot },
    invalidates: [['grocery']],
    label: mode === 'checked' ? 'Archiver les articles cochés' : 'Archiver toute la liste',
    synthetic: () => snapshot,
    request: async () => {
      await api.post('/grocery-items/archive', { mode, ids: snapshot });
      return snapshot;
    },
  });
}

export async function unarchiveItems(ids?: string[]): Promise<string[]> {
  const archived = queryClient.getQueryData<GroceryListResponse>(queryKeys.grocery(true));
  const snapshot = ids ?? (archived?.items ?? []).map((it) => it.id);
  return runOfflineAware({
    method: 'post',
    url: '/grocery-items/unarchive',
    body: { ids: snapshot },
    invalidates: [['grocery']],
    label: 'Restaurer des articles archivés',
    synthetic: () => snapshot,
    request: async () => {
      await api.post('/grocery-items/unarchive', { ids: snapshot });
      return snapshot;
    },
  });
}

export async function fetchAisles(): Promise<GroceryAisle[]> {
  const { data } = await api.get<GroceryAisle[]>('/grocery-aisles');
  return data;
}

// ── Réordonnancement drag & drop ──────────────────────────────

export interface ReorderItemInput {
  id: string;
  aisle: string;
  position: number;
}

/** PUT /grocery-items/reorder — positions absolues (rejeu offline idempotent). */
export async function reorderGroceryItems(items: ReorderItemInput[]): Promise<{ ok: boolean }> {
  return runOfflineAware({
    method: 'put',
    url: '/grocery-items/reorder',
    body: { items },
    invalidates: [['grocery']],
    label: 'Réordonner la liste',
    synthetic: () => ({ ok: true }),
    request: async () => {
      const { data } = await api.put<{ ok: boolean }>('/grocery-items/reorder', { items });
      return data;
    },
  });
}

export interface ReorderAisleInput {
  name: string;
  sortOrder: number;
}

/** PUT /grocery-aisles/reorder — ordre absolu des cards rayon. */
export async function reorderAisles(order: ReorderAisleInput[]): Promise<{ ok: boolean }> {
  return runOfflineAware({
    method: 'put',
    url: '/grocery-aisles/reorder',
    body: { order },
    invalidates: [['aisles'], ['grocery']],
    label: 'Réordonner les rayons',
    synthetic: () => ({ ok: true }),
    request: async () => {
      const { data } = await api.put<{ ok: boolean }>('/grocery-aisles/reorder', { order });
      return data;
    },
  });
}

// ── Hooks ────────────────────────────────────────────────────

export function useGrocery(archived = false) {
  return useQuery({
    queryKey: queryKeys.grocery(archived),
    queryFn: () => fetchGrocery(archived),
    persister: queryPersisterOption,
  });
}

export function useGroceryActive() {
  // Combine actifs + archivés pour vues cohérentes (HomePage = actifs non cochés).
  return useGrocery(false);
}

export function useToggleCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleCheckItem,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const snap = snapshotCaches(qc);
      updateBothCaches(qc, (items) =>
        items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
      );
      return { snap };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snap) restoreCaches(qc, ctx.snap);
    },
    // Fire-and-forget : en offline, l'invalidation déclenche des refetch qui
    // échouent lentement — les attendre bloquerait la mutation (spinner).
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useCreateGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroceryItem,
    onMutate: async (input: CreateGroceryItemInput) => {
      const now = new Date().toISOString();
      const item: GroceryItem = {
        id: input.id,
        name: input.name,
        quantity: input.quantity ?? 1,
        unit: input.unit,
        aisle: input.aisle,
        position: nextPositionInCache(input.aisle),
        store: input.store ?? null,
        isManual: true,
        checked: false,
        archived: false,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const snap = snapshotCaches(qc);
      const active = snap.active;
      if (active) {
        qc.setQueryData<GroceryListResponse>(queryKeys.grocery(false), {
          ...active,
          items: [...active.items, item],
        });
      }
      return { snap };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snap) restoreCaches(qc, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useUpdateGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateGroceryItem>[1] }) =>
      updateGroceryItem(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const snap = snapshotCaches(qc);
      updateBothCaches(qc, (items) =>
        items.map((it) => (it.id === id ? { ...it, ...input } : it)),
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snap) restoreCaches(qc, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useDeleteGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroceryItem,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const snap = snapshotCaches(qc);
      updateBothCaches(qc, (items) => items.filter((it) => it.id !== id));
      return { snap };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snap) restoreCaches(qc, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useArchiveItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, ids }: { mode: 'checked' | 'all'; ids?: string[] }) =>
      archiveItems(mode, ids),
    // Le déplacement dans le cache se fait au succès (la requête renvoie le
    // snapshot exact des ids archivés, réel comme synthétique).
    onSuccess: (movedIds, { mode }) => {
      if (movedIds.length > 0) moveItems(qc, movedIds, true, mode === 'all');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useUnarchiveItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => unarchiveItems(ids),
    onSuccess: (movedIds) => {
      if (movedIds.length > 0) moveItems(qc, movedIds, false);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useReorderGroceryItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderGroceryItems,
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const snap = snapshotCaches(qc);
      const patch = new Map(items.map((it) => [it.id, it]));
      updateBothCaches(qc, (list) =>
        list.map((it) => {
          const p = patch.get(it.id);
          return p ? { ...it, aisle: p.aisle, position: p.position } : it;
        }),
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snap) restoreCaches(qc, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useReorderAisles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderAisles,
    onMutate: async (order) => {
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const snap = snapshotCaches(qc);
      const sortPatch = new Map(order.map((o) => [o.name, o.sortOrder]));
      const patchAisles = (aisles: GroceryAisle[]) =>
        aisles.map((a) =>
          sortPatch.has(a.name) ? { ...a, sortOrder: sortPatch.get(a.name)! } : a,
        );
      for (const archived of [false, true]) {
        const key = queryKeys.grocery(archived);
        const old = qc.getQueryData<GroceryListResponse>(key);
        if (old) qc.setQueryData<GroceryListResponse>(key, { ...old, aisles: patchAisles(old.aisles) });
      }
      if (snap.aisles) qc.setQueryData<GroceryAisle[]>(queryKeys.aisles, patchAisles(snap.aisles));
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snap) restoreCaches(qc, ctx.snap);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['grocery'] });
      void qc.invalidateQueries({ queryKey: ['aisles'] });
    },
  });
}
