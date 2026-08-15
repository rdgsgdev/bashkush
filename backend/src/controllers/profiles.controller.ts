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

  // Recalcule/persiste les objectifs quotidiens si nécessaire
  // (première fois ou données modifiées hors PUT).
  if (profile) {
    const targets = computeDailyTargets(profile);
    if (
      targets &&
      (profile.dailyCalories !== targets.dailyCalories ||
        profile.dailyProtein !== targets.dailyProtein)
    ) {
      profile = await prisma.profile.update({ where: { userId }, data: targets });
    }
  }

  res.json(profile ?? { onboarded: false });
});

/** Crée/met à jour le profil. Le premier enregistrement marque l'onboarding comme fait. */
export const saveProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const existing = await prisma.profile.findUnique({ where: { userId } });
  const input = saveProfileSchema.parse(req.body);

  // Objectifs quotidiens recalculés sur les données fusionnées
  // (le PUT peut être partiel → on repart des valeurs existantes).
  const merged = { ...existing, ...input, userId } as unknown as Profile;
  const targets = computeDailyTargets(merged);
  const data = {
    ...input,
    dailyCalories: targets?.dailyCalories ?? null,
    dailyProtein: targets?.dailyProtein ?? null,
  };

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
