import { Response } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { saveProfileSchema } from '../schemas/profile.schema';
import { deleteImage, uploadImage } from '../lib/storage';

/** Profil de l'utilisateur connecté (ou `{ onboarded: false }` s'il n'existe pas encore). */
export const getProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const profile = await prisma.profile.findUnique({ where: { userId } });
  res.json(profile ?? { onboarded: false });
});

/** Crée/met à jour le profil. Le premier enregistrement marque l'onboarding comme fait. */
export const saveProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const input = saveProfileSchema.parse(req.body);

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: { ...input },
    create: { ...input, userId, onboardedAt: new Date() },
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
