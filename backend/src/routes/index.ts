import { Router } from 'express';
import mealsRoutes from './meals.routes';
import mealPlansRoutes from './mealPlans.routes';
import groceryRoutes from './grocery.routes';
import aislesRoutes from './aisles.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'bashkush-api' }));

router.use('/meals', mealsRoutes);
router.use('/meal-plans', mealPlansRoutes);
router.use('/grocery-items', groceryRoutes);
router.use('/grocery-aisles', aislesRoutes);

export default router;
