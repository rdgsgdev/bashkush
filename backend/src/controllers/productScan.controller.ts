import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureFamilyId } from '../lib/family';
import { emitFamilyInvalidation } from '../realtime/io';
import { AuthedRequest } from '../middleware/auth';
import { createProductScanSchema } from '../schemas/productScan.schema';
import type { Response } from 'express';

/**
 * GET /api/product-scans — historique des produits analysés par la famille,
 * trié par date de dernier scan (plus récent en premier).
 */
export const listProductScans = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const scans = await prisma.productScan.findMany({
    where: { familyId },
    orderBy: { scannedAt: 'desc' },
  });
  res.json(scans);
});

/**
 * POST /api/product-scans — enregistre (ou met à jour) l'analyse d'un produit.
 * Un produit = un code-barres : re-scanner met à jour le snapshot d'analyse et
 * remonte la card en haut de l'historique (scannedAt = maintenant).
 */
export const upsertProductScan = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const input = createProductScanSchema.parse(req.body);

  const scan = await prisma.productScan.upsert({
    where: { familyId_barcode: { familyId, barcode: input.barcode } },
    update: {
      name: input.name,
      brand: input.brand,
      imageUrl: input.imageUrl,
      score: input.score,
      grade: input.grade,
      positives: input.positives,
      negatives: input.negatives,
      // undefined = pas de changement ; null explicite possible.
      additives: input.additives,
      productType: input.productType ?? 'food',
      scannedAt: new Date(),
    },
    create: {
      // Id client optionnel : un rejeu de la file offline ne crée pas de doublon.
      ...(input.id ? { id: input.id } : {}),
      familyId,
      barcode: input.barcode,
      name: input.name,
      brand: input.brand,
      imageUrl: input.imageUrl,
      score: input.score,
      grade: input.grade,
      positives: input.positives,
      negatives: input.negatives,
      additives: input.additives,
      productType: input.productType ?? 'food',
    },
  });

  emitFamilyInvalidation(familyId, ['productScans']);
  res.status(201).json(scan);
});

/** DELETE /api/product-scans/:id — retire un produit de l'historique. */
export const deleteProductScan = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const existing = await prisma.productScan.findFirst({ where: { id, familyId } });
  if (!existing) throw new HttpError(404, 'Analyse introuvable');
  await prisma.productScan.delete({ where: { id } });
  emitFamilyInvalidation(familyId, ['productScans']);
  res.status(204).send();
});
