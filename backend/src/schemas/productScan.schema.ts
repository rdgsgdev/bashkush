import { z } from 'zod';

// Critère affiché dans le détail d'une analyse (qualité ou défaut).
export const analysisCriterionSchema = z.object({
  key: z.string().min(1), // additifs | satures | bio | fruits_legumes | fibres | sodium | calories | sucres
  label: z.string().min(1), // libellé affiché (ex: « Sucres »)
  status: z.enum(['good', 'bad']),
  detail: z.string().min(1), // ex: « 12 g / 100 g », « 2 additifs dont 1 à risque »
});

// Body de POST /product-scans — snapshot complet calculé côté client à partir
// d'Open Food Facts. L'upsert par (famille, code-barres) met à jour l'analyse
// et la date de dernier scan.
export const createProductScanSchema = z.object({
  // Id optionnel généré par le client : rend le rejeu de la file offline idempotent.
  id: z.string().uuid().optional(),
  barcode: z.string().regex(/^\d{6,14}$/),
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  grade: z.enum(['bon', 'moyen', 'mauvais', 'tres_mauvais', 'inconnu']),
  positives: z.array(analysisCriterionSchema),
  negatives: z.array(analysisCriterionSchema),
});
export type CreateProductScanInput = z.infer<typeof createProductScanSchema>;
