import { Response } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { AuthedRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
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

/** Courriel Supabase d'un utilisateur (null si introuvable). */
async function findSupabaseEmailById(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email?.toLowerCase() ?? null;
}

/**
 * Liste des membres de la famille de l'utilisateur connecté :
 * - ceux qu'il a invités,
 * - ceux qui l'ont invité (match sur son courriel).
 * Les liens « pending » pointant vers mon courriel deviennent « accepted ».
 */
export const getFamily = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  if (!myEmail) throw new HttpError(400, 'Courriel manquant sur le compte connecté');

  // Auto-acceptation : je dispose d'un compte, donc un lien qui pointe
  // vers mon courriel peut passer en « accepted » immédiatement.
  await prisma.familyMember.updateMany({
    where: { memberEmail: myEmail, status: 'pending' },
    data: { status: 'accepted', memberUserId: userId },
  });

  const [invited, invitedBy] = await Promise.all([
    prisma.familyMember.findMany({
      where: { ownerUserId: userId },
      include: { member: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.familyMember.findMany({
      where: { memberEmail: myEmail, ownerUserId: { not: userId } },
      include: { owner: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Le courriel de l'inviteur n'est pas dans `profiles` → Supabase Auth.
  const inviterEmails = await Promise.all(
    invitedBy.map((m) => findSupabaseEmailById(m.ownerUserId)),
  );

  const members: FamilyMemberView[] = [
    ...invited.map((m) => ({
      id: m.id,
      email: m.memberEmail,
      fullName: m.member?.fullName ?? null,
      status: m.status as 'pending' | 'accepted',
      direction: 'invited' as const,
    })),
    ...invitedBy.map((m, i) => ({
      id: m.id,
      email: inviterEmails[i] ?? m.ownerUserId,
      fullName: m.owner.fullName ?? null,
      status: m.status as 'pending' | 'accepted',
      direction: 'invited_by' as const,
    })),
  ];

  res.json(members);
});

/** Ajoute un membre de famille par courriel (pending tant qu'il n'a pas de compte). */
export const addFamilyMember = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  const { email } = addFamilyMemberSchema.parse(req.body);

  if (email === myEmail) throw new HttpError(400, 'Tu ne peux pas t’ajouter toi-même');

  // La personne a-t-elle déjà un compte ? → lien accepté immédiatement.
  const targetUserId = await findSupabaseUserIdByEmail(email);

  // Lien déjà existant, dans un sens ou dans l'autre ?
  const alreadyInvited = await prisma.familyMember.findFirst({
    where: { ownerUserId: userId, memberEmail: email },
  });
  const alreadyInvitedBy =
    targetUserId && myEmail
      ? await prisma.familyMember.findFirst({
          where: { ownerUserId: targetUserId, memberEmail: myEmail },
        })
      : null;
  if (alreadyInvited || alreadyInvitedBy) {
    throw new HttpError(409, 'Ce courriel fait déjà partie de ta famille');
  }

  const member = await prisma.familyMember.create({
    data: {
      ownerUserId: userId,
      memberEmail: email,
      memberUserId: targetUserId,
      status: targetUserId ? 'accepted' : 'pending',
    },
  });
  res.status(201).json(member);
});

/** Retire un lien de famille (le propriétaire ou la personne invitée peuvent le faire). */
export const removeFamilyMember = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.authUser!.id;
  const myEmail = req.authUser!.email?.toLowerCase() ?? null;
  const { id } = req.params;

  const member = await prisma.familyMember.findUnique({ where: { id } });
  if (!member) throw new HttpError(404, 'Membre introuvable');
  if (member.ownerUserId !== userId && member.memberEmail !== myEmail) {
    throw new HttpError(403, 'Tu ne peux retirer que les membres de ta famille');
  }

  await prisma.familyMember.delete({ where: { id } });
  res.status(204).send();
});
