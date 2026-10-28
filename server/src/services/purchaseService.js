import {
  PurchaseOrder,
  PurchaseInvoice,
  PurchaseReturn,
  InventoryBatch,
  StockMovement,
  Supplier,
  Payment,
} from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const createPurchaseOrder = async (data, user, req) => {
  const count = await PurchaseOrder.countDocuments();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const poNumber = `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  const po = await PurchaseOrder.create({
    ...data,
    poNumber,
    createdBy: user._id,
  });

  await logAudit({
    user,
    action: 'CREATE_PURCHASE_ORDER',
    module: 'Purchases',
    outlet: data.outlet,
    details: { poNumber, totalAmount: data.totalAmount },
    req,
  });

  return po;
};

export const receiveGoodsInvoice = async (data, user, req) => {
  const {
    supplier,
    outlet,
    supplierInvoiceNumber,
    purchaseOrder,
    items,
    discount = 0,
    paidAmount = 0,
    paymentMethod = 'Bank Transfer',
  } = data;

  if (!items || items.length === 0) {
    throw new Error('At least one item must be received');
  }

  const count = await PurchaseInvoice.countDocuments();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invoiceNumber = `PI-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  let subtotal = 0;
  let totalTax = 0;
  const processedItems = [];

  for (const item of items) {
    const itemSubtotal = item.quantity * item.purchasePrice;
    const itemTax = (itemSubtotal * (item.gstRate || 12)) / 100;
    const itemTotal = itemSubtotal + itemTax;

    subtotal += itemSubtotal;
    totalTax += itemTax;

    // Create or find Inventory Batch
    let batch = await InventoryBatch.findOne({
      product: item.product,
      batchNumber: item.batchNumber.trim().toUpperCase(),
      outlet,
    });

    const prevQty = batch ? batch.availableQuantity : 0;
    const totalQty = Number(item.quantity) + Number(item.freeQuantity || 0);

    if (batch) {
      batch.quantityReceived += totalQty;
      batch.availableQuantity += totalQty;
      batch.purchaseCost = item.purchasePrice;
      batch.mrp = item.mrp;
      batch.sellingPrice = item.sellingPrice;
      batch.expiryDate = new Date(item.expiryDate);
      if (item.mfgDate) batch.mfgDate = new Date(item.mfgDate);
      batch.status = 'Available';
      await batch.save();
    } else {
      batch = await InventoryBatch.create({
        product: item.product,
        batchNumber: item.batchNumber.trim().toUpperCase(),
        mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
        expiryDate: new Date(item.expiryDate),
        supplier,
        purchaseCost: item.purchasePrice,
        mrp: item.mrp,
        sellingPrice: item.sellingPrice,
        quantityReceived: totalQty,
        availableQuantity: totalQty,
        outlet,
      });
    }

    // Record Stock Movement
    await StockMovement.create({
      product: item.product,
      batch: batch._id,
      outlet,
      movementType: 'PURCHASE_IN',
      quantity: totalQty,
      previousQuantity: prevQty,
      newQuantity: batch.availableQuantity,
      referenceType: 'PurchaseInvoice',
      referenceNumber: invoiceNumber,
      remarks: `Goods received via bill ${supplierInvoiceNumber || invoiceNumber}`,
      performedBy: user._id,
    });

    processedItems.push({
      ...item,
      taxAmount: Math.round(itemTax * 100) / 100,
      totalAmount: Math.round(itemTotal * 100) / 100,
      batchId: batch._id,
    });
  }

  const rawGrandTotal = subtotal + totalTax - discount;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  let paymentStatus = 'Unpaid';
  if (paidAmount >= grandTotal) {
    paymentStatus = 'Paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'Partially Paid';
  }

  const purchaseInvoice = await PurchaseInvoice.create({
    invoiceNumber,
    supplierInvoiceNumber,
    purchaseOrder,
    supplier,
    outlet,
    items: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    taxAmount: Math.round(totalTax * 100) / 100,
    roundOff,
    grandTotal,
    paidAmount,
    paymentStatus,
    createdBy: user._id,
  });

  // Update Supplier Khata (credit balance)
  const netSupplierDebt = grandTotal - paidAmount;
  await Supplier.findByIdAndUpdate(supplier, {
    $inc: { outstandingBalance: netSupplierDebt },
  });

  // If initial payment was made during goods receipt
  if (paidAmount > 0) {
    const payCount = await Payment.countDocuments();
    await Payment.create({
      paymentNumber: `PAY-${dateStr}-${String(payCount + 1).padStart(4, '0')}`,
      type: 'OUT',
      partyType: 'Supplier',
      partyId: supplier,
      amount: paidAmount,
      paymentMethod,
      referenceType: 'PurchaseInvoice',
      referenceId: purchaseInvoice._id,
      referenceNumber: invoiceNumber,
      outlet,
      notes: `Payment for purchase bill ${supplierInvoiceNumber || invoiceNumber}`,
      recordedBy: user._id,
    });
  }

  // Update PO status if linked
  if (purchaseOrder) {
    await PurchaseOrder.findByIdAndUpdate(purchaseOrder, {
      status: 'Received',
    });
  }

  await logAudit({
    user,
    action: 'RECEIVE_GOODS',
    module: 'Purchases',
    outlet,
    details: {
      invoiceNumber,
      supplierInvoiceNumber,
      grandTotal,
      itemsCount: items.length,
    },
    req,
  });

  return purchaseInvoice;
};

export const processPurchaseReturn = async (data, user, req) => {
  const { supplier, outlet, originalPurchaseInvoice, items } = data;

  if (!items || items.length === 0) {
    throw new Error('No items specified for return');
  }

  const count = await PurchaseReturn.countDocuments();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const returnNumber = `PR-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  let totalRefund = 0;

  for (const item of items) {
    const batch = await InventoryBatch.findById(item.batch);
    if (!batch) {
      throw new Error(`Batch not found for product`);
    }

    if (batch.availableQuantity < item.quantity) {
      throw new Error(
        `Cannot return ${item.quantity} units from batch ${batch.batchNumber}. Available: ${batch.availableQuantity}`
      );
    }

    const prevQty = batch.availableQuantity;
    batch.availableQuantity -= item.quantity;
    if (batch.availableQuantity === 0) {
      batch.status = 'Depleted';
    }
    await batch.save();

    await StockMovement.create({
      product: item.product,
      batch: batch._id,
      outlet,
      movementType: 'RETURN_OUT',
      quantity: -item.quantity,
      previousQuantity: prevQty,
      newQuantity: batch.availableQuantity,
      referenceType: 'PurchaseReturn',
      referenceNumber: returnNumber,
      remarks: `Purchase return to supplier (${item.reason})`,
      performedBy: user._id,
    });

    totalRefund += item.quantity * item.unitCost;
  }

  const purchaseReturn = await PurchaseReturn.create({
    returnNumber,
    supplier,
    originalPurchaseInvoice,
    outlet,
    items,
    totalRefund: Math.round(totalRefund * 100) / 100,
    createdBy: user._id,
  });

  // Reduce supplier balance (we owe less)
  await Supplier.findByIdAndUpdate(supplier, {
    $inc: { outstandingBalance: -Math.round(totalRefund * 100) / 100 },
  });

  await logAudit({
    user,
    action: 'PURCHASE_RETURN',
    module: 'Purchases',
    outlet,
    details: { returnNumber, totalRefund, itemsCount: items.length },
    req,
  });

  return purchaseReturn;
};

export const getPurchaseInvoices = async ({ outletId, supplierId, page = 1, limit = 50 }) => {
  const query = {};
  if (outletId) query.outlet = outletId;
  if (supplierId) query.supplier = supplierId;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await PurchaseInvoice.countDocuments(query);

  const invoices = await PurchaseInvoice.find(query)
    .populate('supplier', 'companyName phone gstin')
    .populate('outlet', 'name code')
    .populate('items.product', 'name genericName uom')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    invoices,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

export const getPurchaseOrders = async ({ outletId, status, page = 1, limit = 50 }) => {
  const query = {};
  if (outletId) query.outlet = outletId;
  if (status) query.status = status;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await PurchaseOrder.countDocuments(query);

  const orders = await PurchaseOrder.find(query)
    .populate('supplier', 'companyName phone')
    .populate('items.product', 'name genericName uom')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};
