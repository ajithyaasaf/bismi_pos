import { Router } from 'express';
import { getExpenses, createExpense } from './expense.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getExpenses);
router.post('/', createExpense);

export default router;
