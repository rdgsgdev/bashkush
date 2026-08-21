import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ── Dates ───────────────────────────────────────────────────

/** Convertit une date en chaîne ISO courte (YYYY-MM-DD) en heure locale. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date d'aujourd'hui au format YYYY-MM-DD. */
export function todayValue(): string {
  return toDateInputValue(new Date());
}

/** Parse YYYY-MM-DD en Date locale (minuit). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Formate une date ISO/YYYY-MM-DD en « 12 août 2026 ». */
export function formatLongDate(value: string | Date): string {
  const d = typeof value === 'string' ? parseDate(value.slice(0, 10)) : value;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Formate une date ISO/YYYY-MM-DD en « 12 août ». */
export function formatShortDate(value: string | Date): string {
  const d = typeof value === 'string' ? parseDate(value.slice(0, 10)) : value;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Temps relatif d'un scan : « À l'instant », « Il y a 2 h », « Hier »,
 * « Il y a 2 jours », « La semaine dernière », « Le mois dernier »,
 * « Il y a 4 mois », « L'année dernière », « Il y a 3 ans »…
 */
export function formatRelativeScanDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'À l\u2019instant';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'À l\u2019instant';
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 14) return 'La semaine dernière';
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  if (days < 60) return 'Le mois dernier';
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  if (days < 730) return 'L\u2019année dernière';
  return `Il y a ${Math.floor(days / 365)} ans`;
}

// ── Quantités / formatage ───────────────────────────────────

/** Affiche proprement une quantité (1 au lieu de 1.0). */
export function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

/** Formate un couple quantité + unité (« 120 g », « 2 pièces »). */
export function formatQuantity(qty: number, unit: string): string {
  return `${formatQty(qty)} ${unit}`;
}

// ── Rayons ──────────────────────────────────────────────────

/** Détermine la couleur pastel associée à un rayon. */
export function aisleColor(aisle: string): string {
  const map: Record<string, string> = {
    fruits_legumes: 'bg-emerald-100 text-emerald-700',
    proteines: 'bg-rose-100 text-rose-700',
    feculents: 'bg-amber-100 text-amber-700',
    cremerie: 'bg-sky-100 text-sky-700',
    epicerie_seche: 'bg-orange-100 text-orange-700',
    conserves: 'bg-stone-200 text-stone-700',
    surgelas: 'bg-cyan-100 text-cyan-700',
    boissons: 'bg-violet-100 text-violet-700',
    epices_condiments: 'bg-red-100 text-red-700',
  };
  return map[aisle] ?? 'bg-stone-100 text-stone-600';
}
