import { Router } from 'express';
import { getPurchases, createPurchase } from './purchase.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getPurchases);
router.post('/', requireRoles(['OWNER', 'MANAGER']), createPurchase);

export default router;
