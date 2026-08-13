import { AISLE_LABELS, DIFFICULTY_LABELS, CATEGORY_LABELS } from '../types';

export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const AISLE_OPTIONS_LIST = Object.entries(AISLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const UNIT_OPTIONS = [
  'g',
  'kg',
  'ml',
  'L',
  'c. à soupe',
  'c. à café',
  'pièce',
  'bouquet',
  'gousse',
  'tranche',
  'boîte',
  'tasse',
];

export const STATUS_OPTIONS = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_preparation', label: 'En préparation' },
  { value: 'prepare', label: 'Préparé' },
] as const;
