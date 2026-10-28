import express from 'express';
import {
  listProducts,
  getProduct,
  addProduct,
  editProduct,
  getSubstitutes,
  getMetadata,
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listProducts);
router.get('/metadata', getMetadata);
router.get('/substitutes', getSubstitutes);
router.get('/:id', getProduct);

router.post('/', authorize('Super Admin', 'Business Owner', 'Pharmacist', 'Store Manager'), addProduct);
router.put('/:id', authorize('Super Admin', 'Business Owner', 'Pharmacist', 'Store Manager'), editProduct);

export default router;
