import { Response } from 'express';
import type { Profile } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { saveProfileSchema } from '../schemas/profile.schema';
import { deleteImage, uploadImage } from '../lib/storage';
import { computeDailyTargets } from '../lib/nutrition';
import { ensureFamilyId } from '../lib/family';
import { emitFamilyInvalidation } from '../realtime/io';
import { supabase } from '../config/supabase';

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
  // Le nom/photo du membre apparaissent dans les vues « famille » des autres.
  const familyId = await ensureFamilyId(req.authUser!.id, req.authUser!.email).catch(() => null);
  if (familyId) emitFamilyInvalidation(familyId, ['family']);
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

/**
 * Suppression du compte de l'utilisateur connecté :
 * - profil, photo et invitations envoyées (cascade Prisma) ;
 * - invitations/memberships pointant vers son courriel ;
 * - jobs IA en cours ;
 * - si sa famille devient orpheline (plus aucun compte rattaché) : plats,
 *   planifications, liste de courses et options de la famille ;
 * - l'utilisateur Supabase Auth est supprimé en dernier (le jeton du client
 *   devient invalide → déconnexion automatique).
 */
export const deleteAccount = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const memberEmail = (req.authUser!.email ?? '').toLowerCase();

  // Chemins Storage à nettoyer — collectés avant la transaction.
  const existing = await prisma.profile.findUnique({ where: { userId } });
  const familyId = existing?.familyId ?? null;
  const mealImagePaths = familyId
    ? (
        await prisma.meal.findMany({
          where: { familyId },
          select: { imagePath: true },
        })
      )
        .map((m) => m.imagePath)
        .filter((p): p is string => Boolean(p))
    : [];

  await prisma.$transaction(async (tx) => {
    // Invitations envoyées : cascade. Memberships : memberUserId → null.
    if (existing) {
      await tx.profile.delete({ where: { userId } });
    }
    // Toute trace du courriel dans les familles (invitations en attente,
    // memberships acceptés désormais détachés).
    if (memberEmail) {
      await tx.familyMember.deleteMany({ where: { memberEmail } });
    }
    await tx.aiMealJob.deleteMany({ where: { userId } });

    // Famille orpheline (aucun profil restant) → données partagées supprimées.
    if (familyId) {
      const remaining = await tx.profile.count({ where: { familyId } });
      if (remaining === 0) {
        await tx.aiMealJob.deleteMany({ where: { familyId } });
        // Plats d'abord : ingrédients, étapes et planifications cascadent,
        // et avec eux les contributions à la liste de courses.
        await tx.meal.deleteMany({ where: { familyId } });
        await tx.mealPlan.deleteMany({ where: { familyId } });
        await tx.groceryItem.deleteMany({ where: { familyId } });
        await tx.listOption.deleteMany({ where: { familyId } });
        await tx.familyMember.deleteMany({ where: { familyId } });
        await tx.family.delete({ where: { id: familyId } });
      }
    }
  });

  // Storage : nettoyage fire-and-forget — la base est déjà supprimée, une
  // image résiduelle ne doit pas faire échouer la requête.
  const paths = [existing?.imagePath, ...mealImagePaths].filter(
    (p): p is string => Boolean(p),
  );
  for (const path of paths) {
    deleteImage(path).catch(() => undefined);
  }

  // Auth en dernier : au moindre échec côté Supabase, les données métier
  // sont déjà parties mais l'utilisateur peut reprendre la main.
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Auth user deletion error:', error);
    throw new HttpError(500, 'Compte supprimé côté application mais l’utilisateur Auth subsiste — contactez le support.');
  }
  res.status(204).end();
});
