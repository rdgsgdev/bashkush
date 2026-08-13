import { Router } from 'express';
import { listAisles, createAisle, updateAisle, deleteAisle } from '../controllers/aisles.controller';

const router = Router();

router.get('/', listAisles);
router.post('/', createAisle);
router.put('/:name', updateAisle);
router.delete('/:name', deleteAisle);

export default router;
