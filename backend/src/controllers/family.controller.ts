import { Response } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { ensureFamilyId } from '../lib/family';
import { addFamilyMemberSchema } from '../schemas/family.schema';

/** Vue renvoyée au frontend pour un membre de la famille. */
export interface FamilyMemberView {
  id: string;
  email: string;
  fullName: string | null;
  status: 'pending' | 'accepted';
  /** invited = c'est moi qui ai invité ; invited_by = c'est lui qui m'a invité. */
  direction: 'invited' | 'invited_by';
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
 * Liste les membres de ma famille (moi exclu). L'acceptation des invitations
 * « pending » pointant vers mon courriel se fait dans ensureFamilyId
 * (src/lib/family.ts) — commune à toutes les routes.
 */
export const getFamily = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');

  const familyId = await ensureFamilyId(userId, myEmail);

  // Tous les liens de ma famille, sauf ma propre ligne d'adhésion.
  const links = await prisma.familyMember.findMany({
    where: { familyId, memberUserId: { not: userId } },
    include: { member: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const members: FamilyMemberView[] = links.map((l) => ({
    id: l.id,
    email: l.memberEmail,
    fullName: l.member?.fullName ?? null,
    status: l.status as 'pending' | 'accepted',
    direction: l.invitedById === userId ? ('invited' as const) : ('invited_by' as const),
  }));

  res.json(members);
});

/** Ajoute un membre à ma famille par courriel (pending tant qu'il n'a pas de compte). */
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

  // La personne a-t-elle déjà rejoint une autre famille ?
  if (targetUserId) {
    const targetProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { familyId: true },
    });
    if (targetProfile?.familyId && targetProfile.familyId !== familyId) {
      throw new HttpError(409, 'Ce courriel fait déjà partie d’une autre famille');
    }
  }

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.familyMember.create({
      data: {
        familyId,
        invitedById: userId,
        memberEmail: email,
        memberUserId: targetUserId,
        status: targetUserId ? 'accepted' : 'pending',
      },
    });
    // La personne a un compte et pas de famille → elle rejoint la nôtre immédiatement.
    if (targetUserId) {
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

  const member = await prisma.familyMember.findUnique({ where: { id } });
  if (!member) throw new HttpError(404, 'Membre introuvable');

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { familyId: true },
  });
  const myFamilyId = profile?.familyId ?? null;

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
