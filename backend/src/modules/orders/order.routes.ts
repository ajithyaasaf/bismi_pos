import { Router } from 'express';
import { createOrder, holdOrder, getHeldOrders, cancelOrder } from './order.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.post('/', createOrder);
router.post('/hold', holdOrder);
router.get('/held', getHeldOrders);
router.put('/:id/cancel', cancelOrder);

export default router;
