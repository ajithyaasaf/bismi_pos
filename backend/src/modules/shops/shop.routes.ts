import { Router } from 'express';
import { getShopDetails, updateShopSettings } from './shop.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getShopDetails);
router.put('/', requireRoles(['OWNER', 'MANAGER']), updateShopSettings);

export default router;
