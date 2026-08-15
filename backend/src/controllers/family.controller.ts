import { Response } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { ensureFamilyId } from '../lib/family';
import { computeDailyTargets } from '../lib/nutrition';
import { addFamilyMemberSchema } from '../schemas/family.schema';

/** Vue renvoyée au frontend pour un membre de la famille. */
export interface FamilyMemberView {
  /** id de la ligne family_members, ou userId du profil si aucune ligne n'existe. */
  id: string;
  email: string | null;
  fullName: string | null;
  photoUrl: string | null;
  status: 'pending' | 'accepted';
  /** invited = c'est moi qui ai invité ; invited_by = c'est lui qui m'a invité. */
  direction: 'invited' | 'invited_by';
}

/** Vue renvoyée au frontend pour une invitation reçue d'une autre famille. */
export interface FamilyInvitationView {
  id: string;
  inviterEmail: string | null;
  inviterName: string | null;
}

/**
 * Vue « profil » d'un membre de la famille (moi inclus), utilisée
 * par la modale de génération IA pour la sélection des membres.
 */
export interface FamilyMemberProfileView {
  userId: string;
  fullName: string | null;
  photoUrl: string | null;
  isSelf: boolean;
  dailyCalories: number | null;
  dailyProtein: number | null;
  goals: string[];
  allergies: string | null;
  foodChoices: string[];
}

/** Cherche un utilisateur Supabase par courriel (pagination simple). */
async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
  let page = 1;
  // Garde-fou : au-delà de 20 pages (20 000 utilisateurs), on abandonne
  // et on laisse l'auto-acceptation se faire à la prochaine connexion.
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
    page++;
  }
  return null;
}

/**
 * Liste les membres de ma famille (moi exclu).
 *
 * Source de vérité : profiles.family_id. Les membres « accepted » sont donc
 * lus depuis les profils (nom + photo), et non depuis family_members — dont
 * les lignes peuvent manquer (courses concurrentes, échanges d'invitations).
 * Les invitations « pending » restent lues depuis family_members.
 */
export const getFamily = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');

  const familyId = await ensureFamilyId(userId, myEmail);

  const [profilesInFamily, links] = await Promise.all([
    prisma.profile.findMany({
      where: { familyId, userId: { not: userId } },
      select: { userId: true, fullName: true, photoUrl: true },
    }),
    prisma.familyMember.findMany({ where: { familyId } }),
  ]);
  // Lien de chaque membre accepté (s'il existe) → id utilisable pour le retrait
  // + direction de l'invitation.
  const acceptedLinkByUserId = new Map(
    links.filter((l) => l.status === 'accepted').map((l) => [l.memberUserId ?? '', l]),
  );
  // Membres déjà listés côté profils → on ne les répète pas côté pending.
  const inFamilyUserIds = new Set(profilesInFamily.map((p) => p.userId));

  const members: FamilyMemberView[] = [
    ...profilesInFamily.map((p) => {
      const link = acceptedLinkByUserId.get(p.userId);
      return {
        id: link?.id ?? p.userId,
        email: link?.memberEmail ?? null,
        fullName: p.fullName,
        photoUrl: p.photoUrl,
        status: 'accepted' as const,
        direction:
          link && link.invitedById !== userId ? ('invited_by' as const) : ('invited' as const),
      };
    }),
    ...links
      .filter(
        (l) =>
          l.status === 'pending' &&
          l.memberUserId !== userId &&
          !(l.memberUserId && inFamilyUserIds.has(l.memberUserId)),
      )
      .map((l) => ({
        id: l.id,
        email: l.memberEmail,
        fullName: null,
        photoUrl: null,
        status: 'pending' as const,
        direction: l.invitedById === userId ? ('invited' as const) : ('invited_by' as const),
      })),
  ];

  res.json(members);
});

/**
 * Liste les profils de ma famille (moi inclus) avec le résumé
 * nutritionnel utilisé par la génération IA de plats.
 */
export const listFamilyMemberProfiles = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const myEmail = req.authUser!.email?.toLowerCase() ?? null;
    if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');

    const familyId = await ensureFamilyId(userId, myEmail);

    const profiles = await prisma.profile.findMany({
      where: { familyId },
      orderBy: { createdAt: 'asc' },
    });

    const views: FamilyMemberProfileView[] = profiles.map((p) => {
      // Objectifs : valeurs manuelles si présentes, sinon calcul auto.
      const computed = p.targetsManual ? null : computeDailyTargets(p);
      return {
        userId: p.userId,
        fullName: p.fullName,
        photoUrl: p.photoUrl,
        isSelf: p.userId === userId,
        dailyCalories: computed?.dailyCalories ?? p.dailyCalories,
        dailyProtein: computed?.dailyProtein ?? p.dailyProtein,
        goals: p.goals,
        allergies: p.allergies,
        foodChoices: p.foodChoices,
      };
    });

    res.json(views);
  },
);

/** Ajoute un membre à ma famille par courriel (pending tant qu'il n'a pas rejoint). */
export const addFamilyMember = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  const { email } = addFamilyMemberSchema.parse(req.body);

  if (email === myEmail) throw new HttpError(400, 'Tu ne peux pas t’ajouter toi-même');

  const familyId = await ensureFamilyId(userId, myEmail);

  // La personne a-t-elle déjà un compte ? → lien accepté immédiatement.
  const targetUserId = await findSupabaseUserIdByEmail(email);

  // Déjà invité dans ma famille ?
  const alreadyInvited = await prisma.familyMember.findFirst({
    where: { familyId, memberEmail: email },
  });
  if (alreadyInvited) {
    throw new HttpError(409, 'Ce courriel fait déjà partie de ta famille');
  }

  // La personne a-t-elle déjà rejoint une autre famille ? → invitation en
  // attente : elle pourra l'accepter (et remplacer sa famille) depuis son
  // propre profil, via POST /family/invitations/:id/accept.
  let targetFamilyId: string | null = null;
  if (targetUserId) {
    const targetProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { familyId: true },
    });
    targetFamilyId = targetProfile?.familyId ?? null;
    if (targetFamilyId === familyId) {
      throw new HttpError(409, 'Ce courriel fait déjà partie de ta famille');
    }
  }

  // Accepté immédiatement seulement si la personne a un compte et aucune
  // famille ; sinon (pas de compte, ou déjà dans une autre famille) → pending.
  const autoAccept = Boolean(targetUserId) && !targetFamilyId;

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.familyMember.create({
      data: {
        familyId,
        invitedById: userId,
        memberEmail: email,
        memberUserId: targetUserId,
        status: autoAccept ? 'accepted' : 'pending',
      },
    });
    // La personne a un compte et pas de famille → elle rejoint la nôtre immédiatement.
    if (autoAccept && targetUserId) {
      await tx.profile.updateMany({
        where: { userId: targetUserId, familyId: null },
        data: { familyId },
      });
    }
    return created;
  });
  res.status(201).json(member);
});

/** Retire un membre de ma famille (l'inviteur ou la personne invitée peuvent le faire). */
export const removeFamilyMember = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const { id } = req.params;

  const myProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { familyId: true },
  });
  const myFamilyId = myProfile?.familyId ?? null;

  let member = await prisma.familyMember.findUnique({ where: { id } });

  // Fallback : l'id peut être un userId de profil (membre listé depuis
  // profiles.family_id sans ligne family_members associée).
  if (!member) {
    const target = await prisma.profile.findUnique({
      where: { userId: id },
      select: { userId: true, familyId: true },
    });
    if (target?.familyId && target.familyId === myFamilyId && target.userId !== userId) {
      await prisma.$transaction(async (tx) => {
        await tx.familyMember.deleteMany({
          where: { familyId: myFamilyId, memberUserId: target.userId },
        });
        await tx.profile.update({
          where: { userId: target.userId },
          data: { familyId: null },
        });
      });
      res.status(204).send();
      return;
    }
    throw new HttpError(404, 'Membre introuvable');
  }

  // Le lien doit concerner ma famille, et seul l'inviteur ou l'invité peut le retirer.
  if (member.familyId !== myFamilyId) {
    throw new HttpError(404, 'Membre introuvable');
  }
  if (member.invitedById !== userId && member.memberUserId !== userId) {
    throw new HttpError(403, 'Tu ne peux retirer que les membres de ta famille');
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyMember.delete({ where: { id } });
    // Le membre retiré quitte la famille (sa prochaine visite créera une
    // famille solo ou l'acceptation d'une autre invitation).
    if (member.memberUserId) {
      await tx.profile.updateMany({
        where: { userId: member.memberUserId, familyId: member.familyId },
        data: { familyId: null },
      });
    }
  });
  res.status(204).send();
});

/**
 * Liste les invitations en attente qui me sont adressées par d'autres
 * familles. Une personne ayant déjà une famille doit accepter explicitement
 * pour que son family_id soit remplacé.
 */
export const listFamilyInvitations = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');

  const familyId = await ensureFamilyId(userId, myEmail);

  const invitations = await prisma.familyMember.findMany({
    where: { memberEmail: myEmail, status: 'pending', familyId: { not: familyId } },
    include: { inviter: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Courriel de l'inviteur : sa propre ligne d'adhésion dans sa famille.
  const views: FamilyInvitationView[] = await Promise.all(
    invitations.map(async (inv) => {
      const inviterLink = await prisma.familyMember.findFirst({
        where: { familyId: inv.familyId, memberUserId: inv.invitedById },
        select: { memberEmail: true },
      });
      return {
        id: inv.id,
        inviterEmail: inviterLink?.memberEmail ?? null,
        inviterName: inv.inviter?.fullName ?? null,
      };
    }),
  );

  res.json(views);
});

/** Accepte une invitation : quitte mon ancienne famille et remplace mon family_id. */
export const acceptFamilyInvitation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');
  const { id } = req.params;

  const familyId = await prisma.$transaction(async (tx) => {
    // Même verrou que ensureFamilyId : pas d'acceptation en parallèle d'une
    // (auto-)acceptation concurrente.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

    const invitation = await tx.familyMember.findUnique({ where: { id } });
    if (!invitation || invitation.memberEmail !== myEmail || invitation.status !== 'pending') {
      throw new HttpError(404, 'Invitation introuvable');
    }

    const profile = await tx.profile.findUnique({
      where: { userId },
      select: { familyId: true },
    });
    const oldFamilyId = profile?.familyId ?? null;
    if (invitation.familyId === oldFamilyId) {
      throw new HttpError(409, 'Tu fais déjà partie de cette famille');
    }

    // Je quitte mon ancienne famille (mes plats/listes y restent rattachés).
    if (oldFamilyId) {
      await tx.familyMember.deleteMany({
        where: { familyId: oldFamilyId, memberUserId: userId },
      });
    }

    // Invitation acceptée + nouveau family_id (source de vérité).
    await tx.familyMember.update({
      where: { id },
      data: { status: 'accepted', memberUserId: userId },
    });
    await tx.profile.upsert({
      where: { userId },
      update: { familyId: invitation.familyId },
      create: {
        userId,
        goals: [],
        medicalConditions: [],
        foodChoices: [],
        familyId: invitation.familyId,
      },
    });
    return invitation.familyId;
  });

  res.json({ familyId });
});

/** Refuse une invitation : la ligne d'invitation est supprimée. */
export const declineFamilyInvitation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');
  const { id } = req.params;

  const deleted = await prisma.familyMember.deleteMany({
    where: { id, memberEmail: myEmail, status: 'pending' },
  });
  if (!deleted.count) throw new HttpError(404, 'Invitation introuvable');

  res.status(204).send();
});
