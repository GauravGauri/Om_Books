import {
  getBatches,
  getEligibleFefoBatches,
  adjustStock,
  writeOffStock,
  transferStock,
  getInventoryAlerts,
} from '../services/inventoryService.js';
import { StockMovement } from '../models/index.js';

export const listBatches = async (req, res, next) => {
  try {
    const result = await getBatches(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getFefoAllocation = async (req, res, next) => {
  try {
    const { productId, outletId, quantity } = req.query;
    if (!productId || !outletId || !quantity) {
      return res.status(400).json({ success: false, message: 'productId, outletId, and quantity required' });
    }
    const allocation = await getEligibleFefoBatches(productId, outletId, Number(quantity));
    res.json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
};

export const handleStockAdjustment = async (req, res, next) => {
  try {
    const { batchId, adjustedQuantity, reason } = req.body;
    const batch = await adjustStock({ batchId, adjustedQuantity, reason, user: req.user, req });
    res.json({ success: true, message: 'Stock adjusted successfully', data: batch });
  } catch (err) {
    next(err);
  }
};

export const handleWriteOff = async (req, res, next) => {
  try {
    const { batchId, quantity, type, reason } = req.body;
    const batch = await writeOffStock({ batchId, quantity, type, reason, user: req.user, req });
    res.json({ success: true, message: 'Stock written off successfully', data: batch });
  } catch (err) {
    next(err);
  }
};

export const handleStockTransfer = async (req, res, next) => {
  try {
    const { fromOutletId, toOutletId, batchId, quantity } = req.body;
    const result = await transferStock({ fromOutletId, toOutletId, batchId, quantity, user: req.user, req });
    res.json({ success: true, message: 'Stock transferred successfully', data: result });
  } catch (err) {
    next(err);
  }
};

export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await getInventoryAlerts(req.query.outletId);
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
};

export const getStockMovements = async (req, res, next) => {
  try {
    const { outletId, productId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (outletId) query.outlet = outletId;
    if (productId) query.product = productId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StockMovement.countDocuments(query);

    const movements = await StockMovement.find(query)
      .populate('product', 'name sku uom')
      .populate('batch', 'batchNumber expiryDate')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: movements,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    next(err);
  }
};
