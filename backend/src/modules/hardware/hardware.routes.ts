import { Router } from 'express';
import { getHardwareConfigs, savePrinterConfig, generateTestReceipt } from './hardware.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/configs', getHardwareConfigs);
router.post('/configs', savePrinterConfig);
router.post('/test-receipt', generateTestReceipt);

export default router;
