import { prisma } from '../prisma';

/**
 * Résolution de la famille de l'utilisateur connecté.
 *
 * Ordre de résolution :
 *  1. profiles.family_id (source de vérité de l'appartenance) ;
 *  2. sinon, la plus ancienne invitation « pending » pointant vers mon
 *     courriel → je rejoins cette famille (auto-acceptation) ;
 *  3. sinon, création paresseuse d'une famille « solo ».
 *
 * Le créateur obtient aussi une ligne family_members (accepted) : c'est ce
 * qui permet aux autres membres de la famille de le voir dans /family.
 */

export async function ensureFamilyId(userId: string, email?: string | null): Promise<string> {
  const memberEmail = (email ?? '').toLowerCase();

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { familyId: true },
  });
  if (profile?.familyId) return profile.familyId;

  return prisma.$transaction(async (tx) => {
    // Verrou advisory par utilisateur : les appels parallèles du dashboard
    // (meals, plans, grocery…) voient tous family_id null en même temps et
    // créeraient chacun une famille solo sans ce verrou.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

    const current = await tx.profile.findUnique({
      where: { userId },
      select: { familyId: true },
    });
    if (current?.familyId) return current.familyId;

    // Invitation en attente vers mon courriel ? → je rejoins cette famille.
    if (memberEmail) {
      const invitation = await tx.familyMember.findFirst({
        where: { memberEmail, status: 'pending' },
        orderBy: { createdAt: 'asc' },
      });
      if (invitation) {
        await tx.familyMember.update({
          where: { id: invitation.id },
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
      }
    }

    // Famille solo : création paresseuse. connectOrCreate sur le profil car
    // l'API peut être appelée avant l'onboarding — on crée alors une coquille
    // vide (onboarded_at null) que le premier saveProfile complétera.
    const family = await tx.family.create({
      data: {
        members: {
          create: {
            invitedById: userId,
            memberEmail,
            memberUserId: userId,
            status: 'accepted',
          },
        },
        profiles: {
          connectOrCreate: {
            where: { userId },
            create: { userId, goals: [], medicalConditions: [], foodChoices: [] },
          },
        },
      },
    });
    return family.id;
  });
}
