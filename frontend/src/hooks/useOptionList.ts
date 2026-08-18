// ─────────────────────────────────────────────────────────────
// Accès uniforme aux listes paramétrables de la famille avec
// repli sur les options statiques historiques (premier chargement
// / consultation hors ligne avant le premier fetch).
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useListOptions } from '../api/settings';
import {
  CATEGORY_OPTIONS,
  MEAL_TYPE_OPTIONS,
  STORE_OPTIONS,
  UNIT_OPTIONS,
} from '../lib/options';
import { CATEGORY_LABELS, MEAL_TYPE_LABELS } from '../types';
import type { ListKey } from '../types';

export interface Option {
  /** id de la ligne (vide pour les replis statiques — non éditable). */
  id?: string;
  value: string;
  label: string;
  logoUrl?: string | null;
}

const FALLBACKS: Record<ListKey, Option[]> = {
  category: CATEGORY_OPTIONS,
  meal_type: MEAL_TYPE_OPTIONS,
  store: STORE_OPTIONS,
  unit: UNIT_OPTIONS.map((u) => ({ value: u, label: u })),
};

// Libellés statiques des valeurs historiques — utilisés quand la valeur
// n'est plus dans la liste paramétrable de la famille (valeur retirée).
const LEGACY_LABELS: Partial<Record<ListKey, Record<string, string>>> = {
  category: CATEGORY_LABELS,
  meal_type: MEAL_TYPE_LABELS,
};

/**
 * Options d'une liste paramétrable. Tant que la requête n'a jamais abouti
 * (`undefined`), on sert les défauts statiques ; une liste volontairement
 * vidée par l'utilisateur (`[]`) reste vide.
 */
export function useOptionList(listKey: ListKey) {
  const { data, isLoading } = useListOptions(listKey);
  const options: Option[] =
    data === undefined
      ? FALLBACKS[listKey]
      : data.map((o) => ({ id: o.id, value: o.value, label: o.label, logoUrl: o.logoUrl }));
  return { options, isLoading };
}

/**
 * Résolveur de libellé pour une liste paramétrable : libellé de la famille,
 * sinon libellé historique de la valeur, sinon la valeur brute elle-même
 * (catégorie personnalisée ou retirée de la liste).
 */
export function useOptionLabel(listKey: ListKey): (value?: string | null) => string {
  const { options } = useOptionList(listKey);
  return useCallback(
    (value?: string | null) => {
      if (!value) return '';
      return (
        options.find((o) => o.value === value)?.label ??
        LEGACY_LABELS[listKey]?.[value] ??
        value
      );
    },
    [options, listKey],
  );
}
