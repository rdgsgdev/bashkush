// ── Génération de plats par IA (POST /ai/generate-meal) ──────

import { useMutation } from '@tanstack/react-query';
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
