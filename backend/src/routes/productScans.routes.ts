import { Router } from 'express';
import { listProductScans, upsertProductScan, deleteProductScan } from '../controllers/productScan.controller';

const router = Router();

router.get('/', listProductScans);
router.post('/', upsertProductScan);
router.delete('/:id', deleteProductScan);

export default router;
