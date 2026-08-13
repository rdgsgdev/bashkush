import { randomUUID } from 'crypto';

/** Génère un slug à partir d'un nom (ex: "Bol méditerranéen" → "bol-mediterraneen"). */
export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || `meal-${randomUUID().slice(0, 8)}`;
}

/** Génère un id unique de repas (slug + suffixe court pour garantir l'unicité). */
export function generateMealId(name: string): string {
  return `${slugify(name)}-${randomUUID().slice(0, 6)}`;
}
