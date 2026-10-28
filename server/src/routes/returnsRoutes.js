import express from 'express';
import { handleSalesReturn, listSalesReturns } from '../controllers/returnsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('Super Admin', 'Business Owner', 'Store Manager', 'Pharmacist'), handleSalesReturn);
router.get('/', listSalesReturns);

export default router;
