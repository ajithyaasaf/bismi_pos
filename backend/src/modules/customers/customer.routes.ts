import { Router } from 'express';
import { getCustomers, createCustomer, getCustomerCreditLedger, collectCreditRepayment } from './customer.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id/ledger', getCustomerCreditLedger);
router.post('/:id/repay', collectCreditRepayment);

export default router;
