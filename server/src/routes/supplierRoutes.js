import express from 'express';
import {
  listSuppliers,
  addSupplier,
  updateSupplierDetails,
  paySupplierKhata,
  getHistory,
} from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listSuppliers);
router.post('/', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'), addSupplier);
router.put('/:id', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'), updateSupplierDetails);
router.get('/:id/history', getHistory);
router.post('/:id/pay', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Accountant'), paySupplierKhata);

export default router;
