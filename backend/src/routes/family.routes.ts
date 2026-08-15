import { Router } from 'express';
import { getFamily, addFamilyMember, removeFamilyMember } from '../controllers/family.controller';

const router = Router();

router.get('/', getFamily);
router.post('/', addFamilyMember);
router.delete('/:id', removeFamilyMember);

export default router;
