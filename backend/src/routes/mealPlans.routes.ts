import { Router } from 'express';
import {
  listMealPlans,
  createMealPlan,
  updateMealPlanCtrl,
  updateStatus,
  deleteMealPlanCtrl,
} from '../controllers/mealPlans.controller';

const router = Router();

router.get('/', listMealPlans);
router.post('/', createMealPlan);
router.put('/:id', updateMealPlanCtrl);
router.patch('/:id/status', updateStatus);
router.delete('/:id', deleteMealPlanCtrl);

export default router;
