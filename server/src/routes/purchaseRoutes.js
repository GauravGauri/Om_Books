import express from 'express';
import {
  listPurchaseOrders,
  addPurchaseOrder,
  updateOrderStatus,
  listPurchaseInvoices,
  receiveGoods,
  returnPurchase,
} from '../controllers/purchaseController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Orders
router.get('/orders', listPurchaseOrders);
router.post('/orders', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'), addPurchaseOrder);
router.put('/orders/:id/status', authorize('Super Admin', 'Business Owner', 'Store Manager'), updateOrderStatus);

// Invoices / Goods Receipt
router.get('/invoices', listPurchaseInvoices);
router.post('/receive', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager', 'Pharmacist'), receiveGoods);
router.post('/returns', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'), returnPurchase);

export default router;
