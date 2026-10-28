import { InventoryBatch, StockMovement, Product, Outlet, Notification } from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const getBatches = async ({
  outletId,
  productId,
  search,
  status,
  expiryFilter, // 'expired', 'nearExpiry', 'valid'
  page = 1,
  limit = 50,
}) => {
  const query = {};

  if (outletId) {
    query.outlet = outletId;
  }

  if (productId) {
    query.product = productId;
  }

  const now = new Date();
  if (expiryFilter === 'expired') {
    query.expiryDate = { $lt: now };
  } else if (expiryFilter === 'nearExpiry') {
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 60);
    query.expiryDate = { $gte: now, $lte: nearDate };
  } else if (expiryFilter === 'valid') {
    query.expiryDate = { $gt: now };
  }

  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const batches = await InventoryBatch.find(query)
    .populate('product', 'name genericName sku barcode uom minStockLevel mrp sellingPrice')
    .populate('supplier', 'companyName')
    .populate('outlet', 'name code')
    .sort({ expiryDate: 1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  const total = await InventoryBatch.countDocuments(query);

  // Compute live expiry tags
  batches.forEach((b) => {
    const exp = new Date(b.expiryDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    b.daysToExpiry = diffDays;
    if (diffDays <= 0) {
      b.expiryState = 'EXPIRED';
    } else if (diffDays <= 60) {
      b.expiryState = 'NEAR_EXPIRY';
    } else {
      b.expiryState = 'HEALTHY';
    }
  });

  return {
    batches,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

export const getEligibleFefoBatches = async (productId, outletId, requestedQuantity) => {
  const now = new Date();

  // FEFO rule: Only non-expired batches, sorted ascending by expiry date
  const batches = await InventoryBatch.find({
    product: productId,
    outlet: outletId,
    availableQuantity: { $gt: 0 },
    expiryDate: { $gt: now },
  })
    .sort({ expiryDate: 1 })
    .lean();

  if (!batches || batches.length === 0) {
    throw new Error('No valid, unexpired stock available for this medicine.');
  }

  let remaining = requestedQuantity;
  const allocation = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const qtyToTake = Math.min(batch.availableQuantity, remaining);
    allocation.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      sellingPrice: batch.sellingPrice,
      mrp: batch.mrp,
      allocatedQuantity: qtyToTake,
      availableInBatch: batch.availableQuantity,
    });
    remaining -= qtyToTake;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient stock. Requested: ${requestedQuantity}, but only ${requestedQuantity - remaining} available in eligible non-expired batches.`
    );
  }

  return allocation;
};

export const adjustStock = async ({ batchId, adjustedQuantity, reason, user, req }) => {
  const batch = await InventoryBatch.findById(batchId).populate('product');
  if (!batch) {
    throw new Error('Batch not found');
  }

  const previousQty = batch.availableQuantity;
  const difference = adjustedQuantity - previousQty;

  batch.availableQuantity = adjustedQuantity;
  if (adjustedQuantity === 0) {
    batch.status = 'Depleted';
  } else if (batch.status === 'Depleted') {
    batch.status = 'Available';
  }
  await batch.save();

  await StockMovement.create({
    product: batch.product._id,
    batch: batch._id,
    outlet: batch.outlet,
    movementType: 'ADJUSTMENT',
    quantity: difference,
    previousQuantity: previousQty,
    newQuantity: adjustedQuantity,
    referenceType: 'ManualAdjustment',
    remarks: reason || 'Physical stock reconciliation audit adjustment',
    performedBy: user._id,
  });

  await logAudit({
    user,
    action: 'STOCK_ADJUSTMENT',
    module: 'Inventory',
    outlet: batch.outlet,
    details: {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      previousQty,
      adjustedQuantity,
      difference,
      reason,
    },
    req,
  });

  return batch;
};

export const writeOffStock = async ({ batchId, quantity, type, reason, user, req }) => {
  if (quantity <= 0) {
    throw new Error('Quantity to write off must be greater than zero');
  }

  const batch = await InventoryBatch.findById(batchId).populate('product');
  if (!batch) {
    throw new Error('Batch not found');
  }

  if (batch.availableQuantity < quantity) {
    throw new Error(`Cannot write off ${quantity}. Only ${batch.availableQuantity} available.`);
  }

  const previousQty = batch.availableQuantity;
  batch.availableQuantity -= quantity;
  if (batch.availableQuantity === 0) {
    batch.status = type === 'EXPIRY_WRITEOFF' ? 'Expired' : 'Quarantined';
  }
  await batch.save();

  await StockMovement.create({
    product: batch.product._id,
    batch: batch._id,
    outlet: batch.outlet,
    movementType: type, // 'DAMAGE_WRITEOFF' or 'EXPIRY_WRITEOFF'
    quantity: -quantity,
    previousQuantity: previousQty,
    newQuantity: batch.availableQuantity,
    referenceType: 'AuditReconciliation',
    remarks: reason || `Stock written off: ${type}`,
    performedBy: user._id,
  });

  await logAudit({
    user,
    action: type,
    module: 'Inventory',
    outlet: batch.outlet,
    details: {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      writtenOffQuantity: quantity,
      reason,
    },
    req,
  });

  return batch;
};

export const transferStock = async ({ fromOutletId, toOutletId, batchId, quantity, user, req }) => {
  if (fromOutletId.toString() === toOutletId.toString()) {
    throw new Error('Source and destination outlet cannot be identical');
  }

  const sourceBatch = await InventoryBatch.findById(batchId);
  if (!sourceBatch) {
    throw new Error('Source batch not found');
  }

  if (sourceBatch.availableQuantity < quantity) {
    throw new Error(`Insufficient stock in source batch. Available: ${sourceBatch.availableQuantity}, requested: ${quantity}`);
  }

  // Deduct from source
  const prevSourceQty = sourceBatch.availableQuantity;
  sourceBatch.availableQuantity -= quantity;
  await sourceBatch.save();

  await StockMovement.create({
    product: sourceBatch.product,
    batch: sourceBatch._id,
    outlet: fromOutletId,
    movementType: 'TRANSFER_OUT',
    quantity: -quantity,
    previousQuantity: prevSourceQty,
    newQuantity: sourceBatch.availableQuantity,
    referenceType: 'StockTransfer',
    remarks: `Transfer out to outlet ${toOutletId}`,
    performedBy: user._id,
  });

  // Find or create in destination outlet
  let destBatch = await InventoryBatch.findOne({
    product: sourceBatch.product,
    batchNumber: sourceBatch.batchNumber,
    outlet: toOutletId,
  });

  const prevDestQty = destBatch ? destBatch.availableQuantity : 0;

  if (destBatch) {
    destBatch.availableQuantity += quantity;
    destBatch.quantityReceived += quantity;
    await destBatch.save();
  } else {
    destBatch = await InventoryBatch.create({
      product: sourceBatch.product,
      batchNumber: sourceBatch.batchNumber,
      mfgDate: sourceBatch.mfgDate,
      expiryDate: sourceBatch.expiryDate,
      supplier: sourceBatch.supplier,
      purchaseCost: sourceBatch.purchaseCost,
      mrp: sourceBatch.mrp,
      sellingPrice: sourceBatch.sellingPrice,
      quantityReceived: quantity,
      availableQuantity: quantity,
      outlet: toOutletId,
      locationRack: sourceBatch.locationRack,
    });
  }

  await StockMovement.create({
    product: destBatch.product,
    batch: destBatch._id,
    outlet: toOutletId,
    movementType: 'TRANSFER_IN',
    quantity: quantity,
    previousQuantity: prevDestQty,
    newQuantity: destBatch.availableQuantity,
    referenceType: 'StockTransfer',
    remarks: `Transfer in from outlet ${fromOutletId}`,
    performedBy: user._id,
  });

  await logAudit({
    user,
    action: 'STOCK_TRANSFER',
    module: 'Inventory',
    outlet: fromOutletId,
    details: {
      sourceBatchId: sourceBatch._id,
      destBatchId: destBatch._id,
      quantity,
      fromOutletId,
      toOutletId,
    },
    req,
  });

  return { sourceBatch, destBatch };
};

export const getInventoryAlerts = async (outletId) => {
  const now = new Date();
  const nearExpiryDate = new Date();
  nearExpiryDate.setDate(nearExpiryDate.getDate() + 60);

  // Expired batches
  const expiredBatches = await InventoryBatch.find({
    ...(outletId && { outlet: outletId }),
    availableQuantity: { $gt: 0 },
    expiryDate: { $lt: now },
  })
    .populate('product', 'name sku uom')
    .lean();

  // Near-expiry batches (< 60 days)
  const nearExpiryBatches = await InventoryBatch.find({
    ...(outletId && { outlet: outletId }),
    availableQuantity: { $gt: 0 },
    expiryDate: { $gte: now, $lte: nearExpiryDate },
  })
    .populate('product', 'name sku uom')
    .sort({ expiryDate: 1 })
    .lean();

  // Low stock products
  const products = await Product.find({ status: 'Active' }).lean();
  const batches = await InventoryBatch.find({
    ...(outletId && { outlet: outletId }),
    availableQuantity: { $gt: 0 },
    expiryDate: { $gt: now },
  }).lean();

  const stockMap = {};
  for (const b of batches) {
    const pid = b.product.toString();
    stockMap[pid] = (stockMap[pid] || 0) + b.availableQuantity;
  }

  const lowStockProducts = [];
  for (const p of products) {
    const currentStock = stockMap[p._id.toString()] || 0;
    if (currentStock <= p.minStockLevel) {
      lowStockProducts.push({
        ...p,
        currentStock,
        shortage: p.minStockLevel - currentStock,
      });
    }
  }

  return {
    expiredCount: expiredBatches.length,
    nearExpiryCount: nearExpiryBatches.length,
    lowStockCount: lowStockProducts.length,
    expiredBatches,
    nearExpiryBatches,
    lowStockProducts,
  };
};
