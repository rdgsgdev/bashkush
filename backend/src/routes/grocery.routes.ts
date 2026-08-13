import { Router } from 'express';
import {
  listGroceryItems,
  createGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  toggleCheck,
  archiveItems,
  unarchiveItems,
} from '../controllers/grocery.controller';

const router = Router();

router.get('/', listGroceryItems);
router.post('/', createGroceryItem);
router.post('/archive', archiveItems);
router.post('/unarchive', unarchiveItems);
router.put('/:id', updateGroceryItem);
router.delete('/:id', deleteGroceryItem);
router.patch('/:id/check', toggleCheck);

export default router;
