import { Router } from 'express';
import { getActiveCashSession, openCashSession, closeDayRegister } from './cash.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/active', getActiveCashSession);
router.post('/open', openCashSession);
router.post('/close', closeDayRegister);

export default router;
