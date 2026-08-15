// ── Famille (miroir de la vue renvoyée par GET /family) ──────

export type FamilyMemberStatus = 'pending' | 'accepted';

export interface FamilyMemberView {
  id: string;
  email: string;
  fullName: string | null;
  status: FamilyMemberStatus;
  /** invited = c'est moi qui ai invité ; invited_by = c'est lui qui m'a invité. */
  direction: 'invited' | 'invited_by';
}
