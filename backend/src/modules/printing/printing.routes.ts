import { Router } from 'express';
import { getPrintQueue, reprintSale, updatePrintJobStatus } from './printing.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/queue', getPrintQueue);
router.post('/reprint/:id', reprintSale);
router.put('/jobs/:id/status', updatePrintJobStatus);

export default router;
