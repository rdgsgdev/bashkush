import { Response } from 'express';
import type { Profile } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { saveProfileSchema } from '../schemas/profile.schema';
import { deleteImage, uploadImage } from '../lib/storage';
import { computeDailyTargets } from '../lib/nutrition';

/** Profil de l'utilisateur connecté (ou `{ onboarded: false }` s'il n'existe pas encore). */
export const getProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  let profile = await prisma.profile.findUnique({ where: { userId } });

  // Backfill : calcule les objectifs s'ils n'ont jamais été calculés.
  // (On ne touche jamais aux valeurs manuelles ni déjà calculées —
  // le recalcul auto se fait au PUT.)
  if (profile && !profile.targetsManual && (profile.dailyCalories === null || profile.dailyProtein === null)) {
    const targets = computeDailyTargets(profile);
    if (targets) {
      profile = await prisma.profile.update({ where: { userId }, data: targets });
    }
  }

  res.json(profile ?? { onboarded: false });
});

/** Crée/met à jour le profil. Le premier enregistrement marque l'onboarding comme fait. */
export const saveProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const existing = await prisma.profile.findUnique({ where: { userId } });
  const { syncTargets, dailyCalories, dailyProtein, ...rest } = saveProfileSchema.parse(req.body);

  // Objectifs quotidiens :
  // - syncTargets → recalcul depuis les infos du profil (écrase le manuel)
  // - valeurs fournies → saisie manuelle
  // - mode manuel déjà actif → on conserve les valeurs existantes
  // - sinon → recalcul automatique (mode auto)
  const merged = { ...existing, ...rest, userId } as unknown as Profile;
  let targets: { dailyCalories: number | null; dailyProtein: number | null; targetsManual: boolean };
  if (syncTargets) {
    const t = computeDailyTargets(merged);
    targets = {
      dailyCalories: t?.dailyCalories ?? null,
      dailyProtein: t?.dailyProtein ?? null,
      targetsManual: false,
    };
  } else if (dailyCalories !== undefined || dailyProtein !== undefined) {
    targets = {
      dailyCalories: dailyCalories ?? existing?.dailyCalories ?? null,
      dailyProtein: dailyProtein ?? existing?.dailyProtein ?? null,
      targetsManual: true,
    };
  } else if (existing?.targetsManual) {
    targets = {
      dailyCalories: existing.dailyCalories,
      dailyProtein: existing.dailyProtein,
      targetsManual: true,
    };
  } else {
    const t = computeDailyTargets(merged);
    targets = {
      dailyCalories: t?.dailyCalories ?? null,
      dailyProtein: t?.dailyProtein ?? null,
      targetsManual: false,
    };
  }

  const data = { ...rest, ...targets };

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId, onboardedAt: new Date() },
  });
  res.json(profile);
});

/** Photo de profil (multipart `image`) → Storage Supabase. */
export const uploadProfileImage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (!existing) throw new HttpError(404, 'Profil introuvable — complétez d’abord l’onboarding');
  if (!req.file) throw new HttpError(400, 'Aucune image reçue');

  const { url, path } = await uploadImage(req.file.buffer, req.file.mimetype, `profiles/${userId}`);
  if (existing.imagePath) await deleteImage(existing.imagePath);

  const updated = await prisma.profile.update({
    where: { userId },
    data: { photoUrl: url, imagePath: path },
  });
  res.json(updated);
});
