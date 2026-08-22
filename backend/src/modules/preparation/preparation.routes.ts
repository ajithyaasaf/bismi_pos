import { Router } from 'express';
import { getPreparationQueue as getPrepQueue, getReadyOrders, markOrderReady } from './preparation.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/queue', getPrepQueue);
router.get('/ready', getReadyOrders);
router.post('/:id/ready', markOrderReady);

export default router;
