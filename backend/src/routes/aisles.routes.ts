import { Router } from 'express';
import {
  listAisles,
  createAisle,
  updateAisle,
  deleteAisle,
  reorderAisles,
} from '../controllers/aisles.controller';

const router = Router();

router.get('/', listAisles);
router.post('/', createAisle);
// Avant /:name — sinon « reorder » serait interprété comme un nom de rayon.
router.put('/reorder', reorderAisles);
router.put('/:name', updateAisle);
router.delete('/:name', deleteAisle);

export default router;
