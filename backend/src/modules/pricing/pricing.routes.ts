import { Router } from 'express';
import { updateLiveRate, getPriceHistory } from './pricing.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.post('/update-rate', updateLiveRate);
router.get('/history/:productId', getPriceHistory);

export default router;
