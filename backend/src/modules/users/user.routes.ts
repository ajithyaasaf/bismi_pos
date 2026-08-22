import { Router } from 'express';
import { getUsers, createUser, updateUserPin } from './user.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRoles(['OWNER', 'MANAGER']), getUsers);
router.post('/', requireRoles(['OWNER', 'MANAGER']), createUser);
router.put('/:id/pin', requireRoles(['OWNER', 'MANAGER']), updateUserPin);

export default router;
