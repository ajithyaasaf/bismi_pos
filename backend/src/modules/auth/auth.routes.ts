import { Router } from 'express';
import { login, verifyPin, verifyManagerAuth, getMe } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/verify-pin', verifyPin);
router.post('/verify-manager-pin', authenticateToken, verifyManagerAuth);
router.get('/me', authenticateToken, getMe);

export default router;
