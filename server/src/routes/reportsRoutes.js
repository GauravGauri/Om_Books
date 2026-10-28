import express from 'express';
import {
  getDashboard,
  getGst,
  getScheduleH1,
  getExpiryAudit,
} from '../controllers/reportsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/gst', getGst);
router.get('/schedule-h1', getScheduleH1);
router.get('/expiry-audit', getExpiryAudit);

export default router;
