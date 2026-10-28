import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import posRoutes from './posRoutes.js';
import returnsRoutes from './returnsRoutes.js';
import customerRoutes from './customerRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import financeRoutes from './financeRoutes.js';
import reportsRoutes from './reportsRoutes.js';
import systemRoutes from './systemRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HomeBooks Pharmacy ERP API',
    version: '1.0.0',
  });
});

// Mount modules under /api/v1
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/pos', posRoutes);
router.use('/returns', returnsRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/finance', financeRoutes);
router.use('/reports', reportsRoutes);
router.use('/system', systemRoutes);

export default router;
