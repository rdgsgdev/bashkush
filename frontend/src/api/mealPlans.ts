import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type { MealPlan, MealPlanStatus } from '../types';

export interface MealPlanListParams {
  date?: string;
  from?: string;
  to?: string;
}

export async function fetchMealPlans(params: MealPlanListParams = {}): Promise<MealPlan[]> {
  const { data } = await api.get<MealPlan[]>('/meal-plans', { params });
  return data;
}

export async function createMealPlan(input: {
  mealId: string;
  fromDate: string;
  toDate: string;
  servings: number;
  status: MealPlanStatus;
}): Promise<MealPlan> {
  const { data } = await api.post<MealPlan>('/meal-plans', input);
  return data;
}

export async function updateMealPlan(
  id: string,
  input: Partial<{ mealId: string; fromDate: string; toDate: string; servings: number; status: MealPlanStatus }>,
): Promise<MealPlan> {
  const { data } = await api.put<MealPlan>(`/meal-plans/${id}`, input);
  return data;
}

export async function updatePlanStatus(id: string, status: MealPlanStatus): Promise<MealPlan> {
  const { data } = await api.patch<MealPlan>(`/meal-plans/${id}/status`, { status });
  return data;
}

export async function deleteMealPlan(id: string): Promise<void> {
  await api.delete(`/meal-plans/${id}`);
}

// ── Hooks ───────────────────────────────────────────────────

/** Plans couvrant une date donnée (pour CalendarPage). */
export function useMealPlansForDate(date?: string) {
  return useQuery({
    queryKey: queryKeys.mealPlans(date ? { date } : {}),
    queryFn: () => fetchMealPlans(date ? { date } : {}),
  });
}

/** Plans intersectant une plage (pour le calendrier mensuel + pastilles). */
export function useMealPlansForRange(from?: string, to?: string) {
  const enabled = Boolean(from && to);
  return useQuery({
    queryKey: queryKeys.mealPlans({ from, to }),
    queryFn: () => fetchMealPlans({ from, to }),
    enabled,
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMealPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
      qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useUpdateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateMealPlan>[1] }) =>
      updateMealPlan(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
      qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}

export function useUpdatePlanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MealPlanStatus }) =>
      updatePlanStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mealPlans'] }),
  });
}

export function useDeleteMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMealPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
      qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}
