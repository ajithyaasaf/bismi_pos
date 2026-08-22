import { Router } from 'express';
import { getProducts, createProduct, updateProduct } from './product.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getProducts);
router.post('/', requireRoles(['OWNER', 'MANAGER']), createProduct);
router.put('/:id', requireRoles(['OWNER', 'MANAGER']), updateProduct);

export default router;
