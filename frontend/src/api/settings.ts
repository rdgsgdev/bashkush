// ─────────────────────────────────────────────────────────────
// Paramètres de la famille : réglages IA + listes paramétrables
// (catégories de plats, unités, magasins, types de repas).
// Les mutations se font en ligne (comme l'upload d'image) ; la
// lecture est persistée offline via le persister IndexedDB.
// ─────────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import { queryPersisterOption } from './persist';
import type { FamilySettings, ListKey, ListOption } from '../types';

// ── Réglages IA ──────────────────────────────────────────────

export async function fetchSettings(): Promise<FamilySettings> {
  const { data } = await api.get<FamilySettings>('/settings');
  return data;
}

export async function updateSettings(input: Partial<FamilySettings>): Promise<FamilySettings> {
  const { data } = await api.patch<FamilySettings>('/settings', input);
  return data;
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
    staleTime: 60_000,
    persister: queryPersisterOption,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings, data);
      void qc.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

// ── Listes paramétrables ─────────────────────────────────────

export async function fetchListOptions(listKey: ListKey): Promise<ListOption[]> {
  const { data } = await api.get<ListOption[]>(`/settings/lists/${listKey}`);
  return data;
}

/** Options d'une liste, triées par sortOrder (le backend assure l'ordre). */
export function useListOptions(listKey: ListKey) {
  return useQuery({
    queryKey: queryKeys.lists(listKey),
    queryFn: () => fetchListOptions(listKey),
    persister: queryPersisterOption,
  });
}

export interface CreateListOptionInput {
  label: string;
  sortOrder?: number;
}

export async function createListOption(listKey: ListKey, input: CreateListOptionInput) {
  const { data } = await api.post<ListOption>(`/settings/lists/${listKey}`, input);
  return data;
}

export interface UpdateListOptionInput {
  label?: string;
  sortOrder?: number;
}

export async function updateListOption(
  listKey: ListKey,
  id: string,
  input: UpdateListOptionInput,
) {
  const { data } = await api.put<ListOption>(`/settings/lists/${listKey}/${id}`, input);
  return data;
}

export async function deleteListOption(listKey: ListKey, id: string) {
  await api.delete(`/settings/lists/${listKey}/${id}`);
}

export async function reorderListOptions(
  listKey: ListKey,
  order: { id: string; sortOrder: number }[],
) {
  const { data } = await api.put<{ ok: boolean }>(`/settings/lists/${listKey}/reorder`, { order });
  return data;
}

/** Logo d'un magasin — SVG ou PNG (multipart). */
export async function uploadStoreLogo(id: string, file: File) {
  const form = new FormData();
  form.append('logo', file);
  const { data } = await api.post<ListOption>(`/settings/lists/store/${id}/logo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function useCreateListOption(listKey: ListKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListOptionInput) => createListOption(listKey, input),
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.lists(listKey) }),
  });
}

export function useUpdateListOption(listKey: ListKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateListOptionInput }) =>
      updateListOption(listKey, id, input),
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.lists(listKey) }),
  });
}

export function useDeleteListOption(listKey: ListKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteListOption(listKey, id),
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.lists(listKey) }),
  });
}

export function useReorderListOptions(listKey: ListKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => reorderListOptions(listKey, order),
    // Ordre absolu : le cache est mis à jour localement (drag & drop fluide),
    // l'invalidation refetch en arrière-plan.
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.lists(listKey) }),
  });
}

export function useUploadStoreLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadStoreLogo(id, file),
    onSuccess: (option) => {
      qc.setQueryData<ListOption[]>(queryKeys.lists('store'), (prev) =>
        prev?.map((o) => (o.id === option.id ? option : o)),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.lists('store') });
    },
  });
}
