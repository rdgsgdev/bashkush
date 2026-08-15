import { Router } from 'express';
import {
  getFamily,
  addFamilyMember,
  removeFamilyMember,
  listFamilyInvitations,
  acceptFamilyInvitation,
  declineFamilyInvitation,
  listFamilyMemberProfiles,
} from '../controllers/family.controller';

const router = Router();

router.get('/', getFamily);
// Profils de la famille (moi inclus) — sélection des membres pour l'IA.
router.get('/members', listFamilyMemberProfiles);
router.post('/', addFamilyMember);
router.get('/invitations', listFamilyInvitations);
router.post('/invitations/:id/accept', acceptFamilyInvitation);
router.post('/invitations/:id/decline', declineFamilyInvitation);
router.delete('/:id', removeFamilyMember);

export default router;
