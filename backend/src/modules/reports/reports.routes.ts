import { Router } from 'express';
import { getDashboardMetrics } from './reports.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/dashboard', requireRoles(['OWNER', 'MANAGER']), getDashboardMetrics);

export default router;
