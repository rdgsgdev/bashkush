import type { MealPlan } from '../types';
import { parseDate, toDateInputValue } from './utils';

/**
 * Construit l'ensemble des jours (YYYY-MM-DD) couverts par au moins un plan.
 * Utile pour afficher les pastilles sur le calendrier.
 */
export function buildPlannedDays(plans: MealPlan[]): Set<string> {
  const set = new Set<string>();
  for (const p of plans) {
    const from = parseDate(p.fromDate.slice(0, 10));
    const to = parseDate(p.toDate.slice(0, 10));
    const cur = new Date(from);
    while (cur <= to) {
      set.add(toDateInputValue(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return set;
}

/** Vrai si le plan couvre la date donnée (YYYY-MM-DD). */
export function planCoversDate(plan: MealPlan, date: string): boolean {
  const d = parseDate(date);
  const from = parseDate(plan.fromDate.slice(0, 10));
  const to = parseDate(plan.toDate.slice(0, 10));
  return d >= from && d <= to;
}
