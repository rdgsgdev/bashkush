import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import { queryPersisterOption } from './persist';
import type { MealPlan, MealPlanStatus, MealType } from '../types';

export interface MealPlanListParams {
  date?: string;
  from?: string;
  to?: string;
}

export async function fetchMealPlans(params: MealPlanListParams = {}): Promise<MealPlan[]> {
  const { data } = await api.get<MealPlan[]>('/meal-plans', { params });
  return data;
}

/**
 * Sélection d'ingrédients pour la liste de courses (étape 2 de la modale de
 * planification) : quantités finales, déjà mises à l'échelle/ajustées.
 */
export interface IngredientSelection {
  id: string;
  quantity: number;
}

export async function createMealPlan(input: {
  mealId: string;
  fromDate: string;
  toDate: string;
  servings: number;
  status: MealPlanStatus;
  mealType?: MealType | null;
  ingredients?: IngredientSelection[];
}): Promise<MealPlan> {
  const { data } = await api.post<MealPlan>('/meal-plans', input);
  return data;
}

export async function updateMealPlan(
  id: string,
  input: Partial<{
    mealId: string;
    fromDate: string;
    toDate: string;
    servings: number;
    status: MealPlanStatus;
    mealType?: MealType | null;
    ingredients: IngredientSelection[];
  }>,
): Promise<MealPlan> {
  const { data } = await api.put<MealPlan>(`/meal-plans/${id}`, input);
  return data;
}

export async function updatePlanStatus(id: string, status: MealPlanStatus): Promise<MealPlan> {
  const { data } = await api.patch<MealPlan>(`/meal-plans/${id}/status`, { status });
  return data;
}

/**
 * Enregistre les étapes cochées d'un plan (liste absolue → idempotent).
 * Le serveur dérive le statut depuis ce tableau : source de vérité unique
 * partagée par toute la famille.
 */
export async function updatePlanSteps(id: string, completedSteps: number[]): Promise<MealPlan> {
  const { data } = await api.patch<MealPlan>(`/meal-plans/${id}/steps`, { completedSteps });
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
    persister: queryPersisterOption,
  });
}

/** Plans intersectant une plage (pour le calendrier mensuel + pastilles). */
export function useMealPlansForRange(from?: string, to?: string) {
  const enabled = Boolean(from && to);
  return useQuery({
    queryKey: queryKeys.mealPlans({ from, to }),
    queryFn: () => fetchMealPlans({ from, to }),
    enabled,
    persister: queryPersisterOption,
  });
}

/** Tous les plans de la famille (pour l'accueil : à préparer). */
export function useMealPlans() {
  return useQuery({
    queryKey: queryKeys.mealPlans(),
    queryFn: () => fetchMealPlans(),
    persister: queryPersisterOption,
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

/**
 * Coche/décoche des étapes d'un plan. Update optimiste sur TOUTES les
 * entrées de cache ['mealPlans', …] (date, plage, accueil) — le serveur
 * renvoie le plan à jour (statut dérivé inclus) qui remplace le cache.
 */
export function useUpdatePlanSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completedSteps }: { id: string; completedSteps: number[] }) =>
      updatePlanSteps(id, completedSteps),
    onMutate: async ({ id, completedSteps }) => {
      // Snapshot pour rollback en cas d'échec.
      const snapshots = qc.getQueriesData<MealPlan[]>({ queryKey: ['mealPlans'] });
      for (const [key, plans] of snapshots) {
        if (!plans?.some((p) => p.id === id)) continue;
        qc.setQueryData<MealPlan[]>(
          key,
          plans.map((p) => (p.id === id ? { ...p, completedSteps } : p)),
        );
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, plans]) => qc.setQueryData(key, plans));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
    },
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
