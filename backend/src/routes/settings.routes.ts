import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  listListOptions,
  createListOption,
  updateListOption,
  deleteListOption,
  reorderListOptions,
  uploadStoreLogo,
} from '../controllers/settings.controller';
import { uploadLogo } from '../middleware/upload';

const router = Router();

// Réglages IA de la famille.
router.get('/', getSettings);
router.patch('/', updateSettings);

// Listes paramétrables (catégories, unités, magasins, types de repas).
router.get('/lists/:listKey', listListOptions);
router.post('/lists/:listKey', createListOption);
// Avant /:id — sinon « reorder » serait interprété comme un id d'option.
router.put('/lists/:listKey/reorder', reorderListOptions);
// Logo d'un magasin (SVG ou PNG) — avant /:id pour la même raison.
router.post('/lists/store/:id/logo', uploadLogo.single('logo'), uploadStoreLogo);
router.put('/lists/:listKey/:id', updateListOption);
router.delete('/lists/:listKey/:id', deleteListOption);

export default router;
