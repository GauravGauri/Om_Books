import express from 'express';
import {
  listOutlets,
  createOutlet,
  getAuditLogs,
  getNotifications,
  markNotificationRead,
} from '../controllers/outletController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/outlets', listOutlets);
router.post('/outlets', authorize('Super Admin', 'Business Owner'), createOutlet);

router.get('/audit-logs', authorize('Super Admin', 'Business Owner', 'Auditor'), getAuditLogs);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
