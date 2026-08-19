// ── Session de la modale IA, persistée en IndexedDB ──────────
// Permet à une génération / modification de plat de survivre à la
// fermeture de la modale ou de l'app : l'état (formulaire, chat,
// dernier plat, job en cours) est restauré à la réouverture.

import { createStore, del, get, set } from 'idb-keyval';
import type { MealDraft } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Job serveur suivi par la session (polling à la réouverture). */
export interface ActiveAiJob {
  id: string;
  kind: 'generate' | 'feedback';
}

export interface AiMealSessionForm {
  selectedIds: string[];
  servings: number;
  difficulty: string;
  category: string;
  desiredIngredients: string[];
  description: string;
}

export interface AiMealSession {
  version: 1;
  mode: 'create' | 'edit';
  /** Plat modifié via l'IA (mode edit uniquement). */
  mealId?: string;
  form: AiMealSessionForm;
  generated: MealDraft | null;
  viewServings: number;
  chat: ChatMessage[];
  activeJob: ActiveAiJob | null;
  updatedAt: number;
}

/** Une session non reprise depuis plus de 24 h n'a plus d'intérêt. */
export const AI_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const sessionStore = createStore('bashkush-ai', 'sessions');

const sessionKey = (userId: string) => `ai-meal-session:${userId}`;

/** Charge la session de l'utilisateur (null si absente ou périmée). */
export async function loadAiMealSession(userId: string): Promise<AiMealSession | null> {
  const session = await get<AiMealSession>(sessionKey(userId), sessionStore);
  if (!session) return null;
  if (session.version !== 1 || Date.now() - session.updatedAt > AI_SESSION_TTL_MS) {
    await del(sessionKey(userId), sessionStore).catch(() => undefined);
    return null;
  }
  return session;
}

/** Écrase la session persistée (updatedAt géré ici). */
export async function saveAiMealSession(
  userId: string,
  session: Omit<AiMealSession, 'version' | 'updatedAt'>,
): Promise<void> {
  await set(sessionKey(userId), { ...session, version: 1, updatedAt: Date.now() }, sessionStore);
}

/** Efface la session (enregistrement réussi ou abandon explicite). */
export async function clearAiMealSession(userId: string): Promise<void> {
  await del(sessionKey(userId), sessionStore);
}
