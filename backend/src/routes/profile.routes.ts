import { Router } from 'express';
import { upload } from '../middleware/upload';
import { getProfile, saveProfile, uploadProfileImage } from '../controllers/profiles.controller';

const router = Router();

router.get('/', getProfile);
router.put('/', saveProfile);
router.post('/image', upload.single('image'), uploadProfileImage);

export default router;
