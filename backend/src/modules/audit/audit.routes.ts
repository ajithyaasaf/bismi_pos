import { Router } from 'express';
import { getAuditLogs } from './audit.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRoles(['OWNER', 'MANAGER']), getAuditLogs);

export default router;
