import { Router } from 'express';
import { generateMeal, getIngredientNutrition } from '../controllers/ai.controller';

const router = Router();

// Génère (ou régénère via chat) un plat adapté aux profils sélectionnés.
router.post('/generate-meal', generateMeal);

// Complète automatiquement les apports d'un ingrédient (ajout manuel).
router.post('/ingredient-nutrition', getIngredientNutrition);

export default router;
