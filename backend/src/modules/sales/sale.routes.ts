import { Router } from 'express';
import { checkout, getSalesHistory, getSaleById, cancelSale, syncOfflineSales } from './sale.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.post('/', checkout);
router.post('/checkout', checkout);
router.post('/sync-offline', syncOfflineSales);
router.get('/', getSalesHistory);
router.get('/:id', getSaleById);
router.post('/:id/cancel', cancelSale);

export default router;
