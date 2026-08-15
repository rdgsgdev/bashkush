import { Router } from 'express';
import { generateMeal } from '../controllers/ai.controller';

const router = Router();

// Génère (ou régénère via chat) un plat adapté aux profils sélectionnés.
router.post('/generate-meal', generateMeal);

export default router;
