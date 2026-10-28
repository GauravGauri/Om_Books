import {
  SalesInvoice,
  SalesReturn,
  InventoryBatch,
  StockMovement,
  Customer,
  Payment,
} from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const processSalesReturn = async (data, user, req) => {
  const {
    originalInvoiceId,
    items,
    refundMethod = 'Cash',
    reason = 'Doctor changed prescription',
  } = data;

  const originalInvoice = await SalesInvoice.findById(originalInvoiceId);
  if (!originalInvoice) {
    throw new Error('Original sales invoice not found');
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await SalesReturn.countDocuments();
  const returnNumber = `SR-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  let totalRefundAmount = 0;
  const processedReturnItems = [];

  for (const item of items) {
    const origItem = originalInvoice.items.find(
      (it) => it.product.toString() === item.productId && it.batch.toString() === item.batchId
    );

    if (!origItem) {
      throw new Error(`Item ${item.productName || item.productId} was not found on the original invoice.`);
    }

    const previouslyReturned = origItem.returnedQuantity || 0;
    const maxReturnable = origItem.quantity - previouslyReturned;

    if (item.quantity > maxReturnable) {
      throw new Error(
        `Cannot return ${item.quantity} units of ${origItem.productName}. Maximum returnable: ${maxReturnable}`
      );
    }

    // Update returnedQuantity on original invoice item
    origItem.returnedQuantity = previouslyReturned + item.quantity;

    const unitPrice = origItem.unitPrice;
    const discountFactor = 1 - (origItem.discountPercent || 0) / 100;
    const itemRefund = Math.round(unitPrice * item.quantity * discountFactor * 100) / 100;
    totalRefundAmount += itemRefund;

    const batch = await InventoryBatch.findById(item.batchId);
    if (batch) {
      const prevQty = batch.availableQuantity;

      // Restock only if condition is 'Sellable'
      if (item.condition === 'Sellable') {
        batch.availableQuantity += item.quantity;
        if (batch.status === 'Depleted') {
          batch.status = 'Available';
        }
        await batch.save();

        await StockMovement.create({
          product: origItem.product,
          batch: batch._id,
          outlet: originalInvoice.outlet,
          movementType: 'RETURN_IN',
          quantity: item.quantity,
          previousQuantity: prevQty,
          newQuantity: batch.availableQuantity,
          referenceType: 'SalesReturn',
          referenceNumber: returnNumber,
          remarks: `Customer return restocked: ${reason}`,
          performedBy: user._id,
        });
      } else {
        // Condition is Damaged / Expired: Keep quarantined, log StockMovement
        await StockMovement.create({
          product: origItem.product,
          batch: batch._id,
          outlet: originalInvoice.outlet,
          movementType: 'DAMAGE_WRITEOFF',
          quantity: 0,
          previousQuantity: prevQty,
          newQuantity: prevQty,
          referenceType: 'SalesReturn',
          referenceNumber: returnNumber,
          remarks: `Returned as ${item.condition} (Not restocked): ${reason}`,
          performedBy: user._id,
        });
      }
    }

    processedReturnItems.push({
      product: origItem.product,
      productName: origItem.productName,
      batch: origItem.batch,
      batchNumber: origItem.batchNumber,
      quantity: item.quantity,
      unitPrice,
      refundAmount: itemRefund,
      condition: item.condition || 'Sellable',
    });
  }

  // Update original invoice status
  const allReturned = originalInvoice.items.every((it) => it.quantity === it.returnedQuantity);
  originalInvoice.status = allReturned ? 'Fully Returned' : 'Partially Returned';
  await originalInvoice.save();

  // Create Sales Return record
  const salesReturn = await SalesReturn.create({
    returnNumber,
    originalInvoice: originalInvoice._id,
    originalInvoiceNumber: originalInvoice.invoiceNumber,
    customer: originalInvoice.customer,
    customerName: originalInvoice.customerName,
    outlet: originalInvoice.outlet,
    items: processedReturnItems,
    totalRefundAmount: Math.round(totalRefundAmount * 100) / 100,
    refundMethod,
    reason,
    cashier: user._id,
  });

  // Handle refund settlement
  if (refundMethod === 'Khata Credit' && originalInvoice.customer) {
    await Customer.findByIdAndUpdate(originalInvoice.customer, {
      $inc: { outstandingBalance: -Math.round(totalRefundAmount * 100) / 100 },
    });
  } else if (refundMethod === 'Cash' || refundMethod === 'UPI') {
    const payCount = await Payment.countDocuments();
    await Payment.create({
      paymentNumber: `PAY-${dateStr}-${String(payCount + 1).padStart(4, '0')}`,
      type: 'OUT',
      partyType: originalInvoice.customer ? 'Customer' : 'Other',
      partyId: originalInvoice.customer,
      partyName: originalInvoice.customerName,
      amount: Math.round(totalRefundAmount * 100) / 100,
      paymentMethod: refundMethod === 'UPI' ? 'UPI' : 'Cash',
      referenceType: 'SalesReturn',
      referenceId: salesReturn._id,
      referenceNumber: returnNumber,
      outlet: originalInvoice.outlet,
      notes: `Refund for customer sales return ${returnNumber}`,
      recordedBy: user._id,
    });
  }

  await logAudit({
    user,
    action: 'SALES_RETURN',
    module: 'Returns',
    outlet: originalInvoice.outlet,
    details: {
      returnNumber,
      originalInvoiceNumber: originalInvoice.invoiceNumber,
      totalRefundAmount,
      refundMethod,
      itemsCount: items.length,
    },
    req,
  });

  return salesReturn;
};

export const getSalesReturns = async ({ outletId, page = 1, limit = 50 }) => {
  const query = {};
  if (outletId) query.outlet = outletId;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await SalesReturn.countDocuments(query);

  const returns = await SalesReturn.find(query)
    .populate('cashier', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    returns,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};
