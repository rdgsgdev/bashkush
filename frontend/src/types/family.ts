// ── Famille (miroir de la vue renvoyée par GET /family) ──────

export type FamilyMemberStatus = 'pending' | 'accepted';

export interface FamilyMemberView {
  /** id de la ligne family_members, ou userId du profil si aucune ligne n'existe. */
  id: string;
  email: string | null;
  fullName: string | null;
  photoUrl: string | null;
  status: FamilyMemberStatus;
  /** invited = c'est moi qui ai invité ; invited_by = c'est lui qui m'a invité. */
  direction: 'invited' | 'invited_by';
}

// ── Invitations reçues d'une autre famille (GET /family/invitations) ──

export interface FamilyInvitationView {
  id: string;
  inviterEmail: string | null;
  inviterName: string | null;
}
