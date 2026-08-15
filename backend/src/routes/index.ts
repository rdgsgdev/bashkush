import { Router } from 'express';
import mealsRoutes from './meals.routes';
import mealPlansRoutes from './mealPlans.routes';
import groceryRoutes from './grocery.routes';
import aislesRoutes from './aisles.routes';
import profileRoutes from './profile.routes';
import familyRoutes from './family.routes';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'bashkush-api' }));

// Toutes les routes métier exigent une session Supabase valide (Apple / Google).
router.use(requireAuth);

router.use('/meals', mealsRoutes);
router.use('/meal-plans', mealPlansRoutes);
router.use('/grocery-items', groceryRoutes);
router.use('/grocery-aisles', aislesRoutes);
router.use('/profile', profileRoutes);
router.use('/family', familyRoutes);

export default router;
