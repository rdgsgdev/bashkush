// ─────────────────────────────────────────────────────────────
// Paramètres de la famille : toggles IA + listes paramétrables
// (catégories de plats, unités, magasins, types de repas).
// ─────────────────────────────────────────────────────────────

import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { ensureFamilyId } from '../lib/family';
import { getListOptions, getFamilySettings, ListKey } from '../lib/listOptions';
import { uploadImage, deleteImage } from '../lib/storage';
import { emitFamilyInvalidation } from '../realtime/io';
import {
  updateSettingsSchema,
  listKeySchema,
  createListOptionSchema,
  updateListOptionSchema,
  reorderListOptionsSchema,
} from '../schemas/settings.schema';
import type { Response } from 'express';

/** Slug snake_case d'un libellé (ex: "Jean Coutu" → "jean_coutu", cohérent avec les clés existantes). */
function optionValueSlug(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return base || 'option';
}

/** GET /api/settings — réglages IA de la famille. */
export const getSettings = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  res.json(await getFamilySettings(familyId));
});

/** PATCH /api/settings — active/désactive les fonctions IA (toute la famille). */
export const updateSettings = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const input = updateSettingsSchema.parse(req.body);
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  const family = await prisma.family.update({
    where: { id: familyId },
    data: input,
    select: { aiMealGenerationEnabled: true, aiNutritionEnabled: true },
  });
  emitFamilyInvalidation(familyId, ['settings']);
  res.json(family);
});

/** Lit et valide le :listKey d'une requête. */
function parseListKey(req: AuthedRequest): ListKey {
  const parsed = listKeySchema.safeParse(req.params.listKey);
  if (!parsed.success) throw new HttpError(404, 'Liste introuvable');
  return parsed.data;
}

/**
 * GET /api/settings/lists/:listKey — options de la liste. Au premier accès,
 * les défauts sont matérialisés en base pour devenir éditables.
 */
export const listListOptions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const listKey = parseListKey(req);
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);
  res.json(await getListOptions(familyId, listKey, { materialize: true }));
});

/** POST /api/settings/lists/:listKey — ajoute une option (value dérivée du label). */
export const createListOption = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const listKey = parseListKey(req);
  const input = createListOptionSchema.parse(req.body);
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);

  // Les unités se réfèrent par leur libellé exact : value = label.
  // Les autres listes utilisent une clé technique snake_case.
  const value = listKey === 'unit' ? input.label : optionValueSlug(input.label);

  const existing = await prisma.listOption.findMany({
    where: { familyId, listKey },
    select: { value: true },
  });
  const taken = new Set(existing.map((o) => o.value));
  let finalValue = value;
  for (let i = 2; taken.has(finalValue); i++) finalValue = `${value}_${i}`;

  const last = await prisma.listOption.findFirst({
    where: { familyId, listKey },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const option = await prisma.listOption.create({
    data: {
      familyId,
      listKey,
      value: finalValue,
      label: input.label,
      sortOrder: input.sortOrder ?? (last?.sortOrder ?? -1) + 1,
    },
  });
  emitFamilyInvalidation(familyId, ['lists']);
  res.status(201).json(option);
});

/** PUT /api/settings/lists/:listKey/reorder — ordre absolu (rejeu idempotent). */
export const reorderListOptions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const listKey = parseListKey(req);
  const { order } = reorderListOptionsSchema.parse(req.body);
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);

  const ids = order.map((o) => o.id);
  const existing = await prisma.listOption.findMany({
    where: { familyId, listKey, id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((o) => o.id));
  const missing = ids.find((id) => !existingIds.has(id));
  if (missing) throw new HttpError(404, 'Option introuvable');

  await prisma.$transaction(
    order.map((o) =>
      prisma.listOption.update({
        where: { id: o.id },
        data: { sortOrder: o.sortOrder },
      }),
    ),
  );
  emitFamilyInvalidation(familyId, ['lists']);
  res.json({ ok: true, updated: order.length });
});

/** PUT /api/settings/lists/:listKey/:id — renomme (label) et/ou réordonne. */
export const updateListOption = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const listKey = parseListKey(req);
  const id = req.params.id;
  const input = updateListOptionSchema.parse(req.body);
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);

  const option = await prisma.listOption.findFirst({ where: { id, familyId, listKey } });
  if (!option) throw new HttpError(404, 'Option introuvable');

  // Le value est la clé référencée par les données existantes : immuable,
  // sauf pour les unités où value = label (l'ancienne valeur reste sur les
  // données qui l'utilisent, comme pour une suppression).
  const data: { label?: string; value?: string; sortOrder?: number } = { ...input };
  if (input.label && listKey === 'unit') data.value = input.label;

  const updated = await prisma.listOption.update({ where: { id }, data });
  emitFamilyInvalidation(familyId, ['lists']);
  res.json(updated);
});

/**
 * DELETE /api/settings/lists/:listKey/:id — supprime l'option. Toujours
 * autorisée : les données existantes gardent leur valeur brute (même
 * philosophie que les rayons orphelns).
 */
export const deleteListOption = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const listKey = parseListKey(req);
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);

  const option = await prisma.listOption.findFirst({ where: { id, familyId, listKey } });
  if (!option) throw new HttpError(404, 'Option introuvable');

  if (option.logoPath) await deleteImage(option.logoPath);
  await prisma.listOption.delete({ where: { id } });
  emitFamilyInvalidation(familyId, ['lists']);
  res.status(204).send();
});

/**
 * POST /api/settings/lists/store/:id/logo — logo du magasin (SVG ou PNG).
 * Remplace l'éventuel logo précédent dans le bucket Storage.
 */
export const uploadStoreLogo = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email);

  const option = await prisma.listOption.findFirst({
    where: { id, familyId, listKey: 'store' },
  });
  if (!option) throw new HttpError(404, 'Magasin introuvable');

  const file = req.file;
  if (!file) throw new HttpError(400, 'Aucun fichier reçu (champ « logo »)');

  const uploaded = await uploadImage(file.buffer, file.mimetype, `store-logos/${id}`);
  if (option.logoPath) await deleteImage(option.logoPath);

  const updated = await prisma.listOption.update({
    where: { id },
    data: { logoUrl: uploaded.url, logoPath: uploaded.path },
  });
  emitFamilyInvalidation(familyId, ['lists']);
  res.json(updated);
});
