import { Router } from 'express';
import {
  generateMeal,
  getIngredientNutrition,
  createMealJob,
  getMealJob,
} from '../controllers/ai.controller';

const router = Router();

// Génère (ou régénère via chat) un plat adapté aux profils sélectionnés.
// Endpoint synchrone historique (clients PWA encore en cache) — la modale
// IA utilise désormais les jobs ci-dessous.
router.post('/generate-meal', generateMeal);

// Lance une génération en tâche de fond : la génération continue même si
// le client ferme la modale / quitte l'app ; il interroge ensuite le job.
router.post('/meal-jobs', createMealJob);

// État d'un job de génération (running | done | error) + plat généré.
router.get('/meal-jobs/:id', getMealJob);

// Complète automatiquement les apports d'un ingrédient (ajout manuel).
router.post('/ingredient-nutrition', getIngredientNutrition);

export default router;
