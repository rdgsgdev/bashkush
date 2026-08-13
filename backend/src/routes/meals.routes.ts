import { Router } from 'express';
import {
  listMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  toggleFavorite,
  uploadMealImage,
} from '../controllers/meals.controller';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', listMeals);
router.get('/:id', getMeal);
router.post('/', createMeal);
router.put('/:id', updateMeal);
router.delete('/:id', deleteMeal);
router.patch('/:id/favorite', toggleFavorite);
router.post('/:id/image', upload.single('image'), uploadMealImage);

export default router;
