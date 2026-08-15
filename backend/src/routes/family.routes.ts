import { Router } from 'express';
import {
  getFamily,
  addFamilyMember,
  removeFamilyMember,
  listFamilyInvitations,
  acceptFamilyInvitation,
  declineFamilyInvitation,
} from '../controllers/family.controller';

const router = Router();

router.get('/', getFamily);
router.post('/', addFamilyMember);
router.get('/invitations', listFamilyInvitations);
router.post('/invitations/:id/accept', acceptFamilyInvitation);
router.post('/invitations/:id/decline', declineFamilyInvitation);
router.delete('/:id', removeFamilyMember);

export default router;
