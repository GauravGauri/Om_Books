import express from 'express';
import { checkout, listInvoices, getInvoice } from '../controllers/posController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/checkout', authorize('Super Admin', 'Business Owner', 'Pharmacist', 'Store Manager', 'Cashier'), checkout);
router.get('/invoices', listInvoices);
router.get('/invoices/:id', getInvoice);

export default router;
