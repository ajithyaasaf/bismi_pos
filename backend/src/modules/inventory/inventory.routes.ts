import { Router } from 'express';
import { getInventory, recordWastage, adjustStock } from './inventory.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getInventory);
router.post('/wastage', recordWastage);
router.post('/adjust', adjustStock);

export default router;
