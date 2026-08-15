// Clés de cache centralisées pour TanStack Query.
export const queryKeys = {
  meals: ['meals'] as const,
  meal: (id: string) => ['meals', id] as const,
  mealPlans: (params?: { date?: string; from?: string; to?: string }) =>
    ['mealPlans', params ?? {}] as const,
  grocery: (archived: boolean) => ['grocery', { archived }] as const,
  aisles: ['aisles'] as const,
  profile: ['profile'] as const,
  family: ['family'] as const,
};
