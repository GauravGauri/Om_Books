import express from 'express';
import {
  listCustomers,
  addCustomer,
  updateCustomerDetails,
  payCustomerKhata,
  getHistory,
} from '../controllers/customerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listCustomers);
router.post('/', addCustomer);
router.put('/:id', updateCustomerDetails);
router.get('/:id/history', getHistory);
router.post('/:id/pay', payCustomerKhata);

export default router;
