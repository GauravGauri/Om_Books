import express from 'express';
import {
  addExpense,
  listExpenses,
  getCashRegister,
  getPLStatement,
  listPayments,
} from '../controllers/financeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/expenses', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Accountant'), addExpense);
router.get('/expenses', listExpenses);
router.get('/cash-register', getCashRegister);
router.get('/profit-loss', authorize('Super Admin', 'Business Owner', 'Accountant', 'Auditor'), getPLStatement);
router.get('/payments', listPayments);

export default router;
