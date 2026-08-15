// ── Génération de plats par IA (POST /ai/generate-meal) ──────

import { useMutation } from '@tanstack/react-query';
import { api } from './client';
import type { Category, Difficulty, MealDraft } from '../types';

export interface GenerateMealPayload {
  /** userId des profils (membres de la famille) pris en compte. */
  memberIds: string[];
  servings: number;
  difficulty?: Difficulty;
  category?: Category;
  desiredIngredients?: string[];
  description?: string;
  /** Plat précédemment généré (régénération via chat). */
  previousMeal?: MealDraft;
  /** Instruction de modification fournie via le chat. */
  feedback?: string;
}

/**
 * Appelle l'IA : la génération peut prendre du temps, on dépasse
 * le timeout axios par défaut (15 s) pour cette requête uniquement.
 */
export async function generateMeal(payload: GenerateMealPayload): Promise<MealDraft> {
  const { data } = await api.post<{ meal: MealDraft }>('/ai/generate-meal', payload, {
    timeout: 120_000,
  });
  return data.meal;
}

export function useGenerateMeal() {
  return useMutation({ mutationFn: generateMeal });
}
