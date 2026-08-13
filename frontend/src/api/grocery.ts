import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type { GroceryAisle, GroceryItem, GroceryListResponse } from '../types';

export async function fetchGrocery(archived = false): Promise<GroceryListResponse> {
  const { data } = await api.get<GroceryListResponse>('/grocery-items', { params: { archived } });
  return data;
}

export async function createGroceryItem(input: {
  name: string;
  quantity?: number;
  unit: string;
  aisle: string;
  notes?: string | null;
}): Promise<GroceryItem> {
  const { data } = await api.post<GroceryItem>('/grocery-items', input);
  return data;
}

export async function updateGroceryItem(
  id: string,
  input: Partial<{ name: string; quantity: number; unit: string; aisle: string; notes: string | null; checked: boolean }>,
): Promise<GroceryItem> {
  const { data } = await api.put<GroceryItem>(`/grocery-items/${id}`, input);
  return data;
}

export async function deleteGroceryItem(id: string): Promise<void> {
  await api.delete(`/grocery-items/${id}`);
}

export async function toggleCheckItem(id: string): Promise<GroceryItem> {
  const { data } = await api.patch<GroceryItem>(`/grocery-items/${id}/check`);
  return data;
}

export async function archiveItems(mode: 'checked' | 'all', ids?: string[]): Promise<void> {
  await api.post('/grocery-items/archive', { mode, ids });
}

export async function unarchiveItems(ids?: string[]): Promise<void> {
  await api.post('/grocery-items/unarchive', { ids });
}

export async function fetchAisles(): Promise<GroceryAisle[]> {
  const { data } = await api.get<GroceryAisle[]>('/grocery-aisles');
  return data;
}

// ── Hooks ───────────────────────────────────────────────────

export function useGrocery(archived = false) {
  return useQuery({
    queryKey: queryKeys.grocery(archived),
    queryFn: () => fetchGrocery(archived),
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
      await qc.cancelQueries({ queryKey: queryKeys.grocery(false) });
      const prev = qc.getQueryData<GroceryListResponse>(queryKeys.grocery(false));
      qc.setQueryData<GroceryListResponse>(queryKeys.grocery(false), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
        };
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.grocery(false), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useCreateGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroceryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useUpdateGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateGroceryItem>[1] }) =>
      updateGroceryItem(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useDeleteGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroceryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useArchiveItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, ids }: { mode: 'checked' | 'all'; ids?: string[] }) =>
      archiveItems(mode, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useUnarchiveItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => unarchiveItems(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}
