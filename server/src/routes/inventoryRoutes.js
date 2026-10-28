import express from 'express';
import {
  listBatches,
  getFefoAllocation,
  handleStockAdjustment,
  handleWriteOff,
  handleStockTransfer,
  getAlerts,
  getStockMovements,
} from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/batches', listBatches);
router.get('/fefo-allocation', getFefoAllocation);
router.get('/alerts', getAlerts);
router.get('/movements', getStockMovements);

router.post(
  '/adjust',
  authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'),
  handleStockAdjustment
);

router.post(
  '/write-off',
  authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'),
  handleWriteOff
);

router.post(
  '/transfer',
  authorize('Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager'),
  handleStockTransfer
);

export default router;
