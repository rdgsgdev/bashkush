// ── Génération de plats par IA (jobs /ai/meal-jobs) ──────────

import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Difficulty, MealDraft, Nutrition } from '../types';

export interface GenerateMealPayload {
  /** userId des profils (membres de la famille) pris en compte. */
  memberIds: string[];
  servings: number;
  difficulty?: Difficulty;
  /** Clé de la liste paramétrable « category » de la famille (Paramètres). */
  category?: string;
  desiredIngredients?: string[];
  description?: string;
  /** Plat précédemment généré (régénération via chat). */
  previousMeal?: MealDraft;
  /** Instruction de modification fournie via le chat. */
  feedback?: string;
}

/** État d'un job de génération côté serveur. */
export interface MealJob {
  id: string;
  status: 'running' | 'done' | 'error';
  /** Plat généré (status === 'done'). */
  meal?: MealDraft;
  /** Message d'erreur lisible (status === 'error'). */
  error?: string;
}

/**
 * Lance une génération en tâche de fond : le serveur traite même si
 * l'app est fermée, on récupère le résultat en interrogeant le job.
 */
export async function startMealJob(payload: GenerateMealPayload): Promise<string> {
  const { data } = await api.post<{ job: { id: string } }>('/ai/meal-jobs', payload);
  return data.job.id;
}

/** Interroge l'état d'un job (polling toutes les 3 s tant qu'il tourne). */
export async function fetchMealJob(id: string): Promise<MealJob> {
  const { data } = await api.get<{ job: MealJob }>(`/ai/meal-jobs/${id}`);
  return data.job;
}

export function useMealJob(jobId: string | null) {
  return useQuery({
    queryKey: ['ai-meal-job', jobId],
    queryFn: () => fetchMealJob(jobId!),
    enabled: Boolean(jobId),
    // Le job peut aboutir pendant qu'on a quitté l'app : jamais de cache.
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 3_000 : false),
  });
}

// ── Complétion des apports d'un ingrédient (POST /ai/ingredient-nutrition) ──

/**
 * Apports d'un ingrédient pour une quantité donnée, complétés par Sonar
 * (Perplexity) côté backend. Retourne les valeurs TOTALES pour la quantité
 * demandée, ou null si l'IA n'a rien renvoyé d'exploitable.
 */
export async function fetchIngredientNutrition(
  name: string,
  quantity: number,
  unit: string,
): Promise<Nutrition | null> {
  const { data } = await api.post<{ nutrition: Nutrition }>('/ai/ingredient-nutrition', {
    name,
    quantity,
    unit,
  });
  const hasAny = Object.values(data.nutrition ?? {}).some((v) => v !== undefined);
  return hasAny ? data.nutrition : null;
}
