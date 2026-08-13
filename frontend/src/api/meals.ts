import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type { Meal, MealDraft } from '../types';

export async function fetchMeals(): Promise<Meal[]> {
  const { data } = await api.get<Meal[]>('/meals');
  return data;
}
export async function fetchMeal(id: string): Promise<Meal> {
  const { data } = await api.get<Meal>(`/meals/${id}`);
  return data;
}
export async function createMeal(draft: MealDraft): Promise<Meal> {
  const { data } = await api.post<Meal>('/meals', draft);
  return data;
}
export async function updateMeal(id: string, draft: Partial<MealDraft>): Promise<Meal> {
  const { data } = await api.put<Meal>(`/meals/${id}`, draft);
  return data;
}
export async function deleteMeal(id: string): Promise<void> {
  await api.delete(`/meals/${id}`);
}
export async function toggleFavorite(id: string): Promise<Meal> {
  const { data } = await api.patch<Meal>(`/meals/${id}/favorite`);
  return data;
}
export async function uploadMealImage(id: string, file: File): Promise<Meal> {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post<Meal>(`/meals/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Hooks ───────────────────────────────────────────────────

export function useMeals() {
  return useQuery({ queryKey: queryKeys.meals, queryFn: fetchMeals });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMeal,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.meals }),
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: Partial<MealDraft> }) => updateMeal(id, draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.meals }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meals });
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
      qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.meals });
      const prev = qc.getQueryData<Meal[]>(queryKeys.meals);
      qc.setQueryData<Meal[]>(queryKeys.meals, (old) =>
        (old ?? []).map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.meals, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.meals }),
  });
}

export function useUploadMealImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadMealImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.meals }),
  });
}
