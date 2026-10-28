import {
  SalesInvoice,
  InventoryBatch,
  StockMovement,
  Customer,
  Product,
  Payment,
  Notification,
} from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const checkoutPOS = async (data, user, req) => {
  const {
    outlet,
    customer: customerId,
    customerName = 'Walk-in Customer',
    customerPhone,
    doctorName,
    prescriptionNumber,
    items,
    paymentMethod = 'Cash',
    paymentBreakdown = {},
    customDiscountPercent = 0,
  } = data;

  if (!items || items.length === 0) {
    throw new Error('No items in checkout cart');
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await SalesInvoice.countDocuments();
  const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(5, '0')}`;

  let subtotal = 0;
  let totalDiscount = 0;
  let taxableTotal = 0;
  let totalTax = 0;
  const processedItems = [];

  // Validate and deduct stock for each item
  for (const item of items) {
    const batch = await InventoryBatch.findById(item.batchId).populate('product');
    if (!batch) {
      throw new Error(`Batch not found for product ID ${item.productId}`);
    }

    // Safety: check expired stock
    if (new Date(batch.expiryDate) <= now) {
      throw new Error(
        `Critical: Batch ${batch.batchNumber} for medicine ${batch.product.name} expired on ${batch.expiryDate.toISOString().slice(0, 10)}. Expired medicines cannot be sold!`
      );
    }

    // Safety: check stock availability
    if (batch.availableQuantity < item.quantity) {
      throw new Error(
        `Insufficient stock for ${batch.product.name} (Batch: ${batch.batchNumber}). Requested: ${item.quantity}, Available: ${batch.availableQuantity}`
      );
    }

    // Deduct batch stock
    const prevQty = batch.availableQuantity;
    batch.availableQuantity -= item.quantity;
    if (batch.availableQuantity === 0) {
      batch.status = 'Depleted';
    }
    await batch.save();

    // Calculate line item financials
    const unitPrice = item.unitPrice || batch.sellingPrice;
    const lineGross = unitPrice * item.quantity;
    const discountPct = Number(item.discountPercent || customDiscountPercent || 0);
    const itemDiscount = Math.round(((lineGross * discountPct) / 100) * 100) / 100;
    const taxableAmount = lineGross - itemDiscount;
    const gstRate = item.gstRate || batch.product.gstRate || 12;
    const itemTax = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
    const lineTotal = Math.round((taxableAmount + itemTax) * 100) / 100;

    subtotal += lineGross;
    totalDiscount += itemDiscount;
    taxableTotal += taxableAmount;
    totalTax += itemTax;

    // Record Stock Movement
    await StockMovement.create({
      product: batch.product._id,
      batch: batch._id,
      outlet,
      movementType: 'SALE_OUT',
      quantity: -item.quantity,
      previousQuantity: prevQty,
      newQuantity: batch.availableQuantity,
      referenceType: 'SalesInvoice',
      referenceNumber: invoiceNumber,
      remarks: `POS Sale to ${customerName}`,
      performedBy: user._id,
    });

    processedItems.push({
      product: batch.product._id,
      productName: batch.product.name,
      genericName: batch.product.genericName,
      hsnCode: batch.product.hsnCode,
      batch: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: item.quantity,
      unitPrice,
      mrp: batch.mrp,
      discountPercent: discountPct,
      discountAmount: itemDiscount,
      gstRate,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      taxAmount: itemTax,
      totalAmount: lineTotal,
    });

    // Check if total product stock is below minimum level
    const totalRemaining = await InventoryBatch.aggregate([
      { $match: { product: batch.product._id, outlet, availableQuantity: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$availableQuantity' } } },
    ]);
    const currentTotalStock = totalRemaining[0]?.total || 0;
    if (currentTotalStock <= batch.product.minStockLevel) {
      await Notification.create({
        title: 'Low Stock Alert',
        message: `${batch.product.name} is low on stock (${currentTotalStock} remaining, min level: ${batch.product.minStockLevel}).`,
        type: 'LOW_STOCK',
        outlet,
      });
    }
  }

  // Calculate taxes: Half CGST, Half SGST (standard Indian GST rule for intra-state)
  const cgstTotal = Math.round((totalTax / 2) * 100) / 100;
  const sgstTotal = Math.round((totalTax - cgstTotal) * 100) / 100;
  const rawGrandTotal = taxableTotal + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  // Create Sales Invoice
  const salesInvoice = await SalesInvoice.create({
    invoiceNumber,
    customer: customerId || undefined,
    customerName,
    customerPhone,
    doctorName,
    prescriptionNumber,
    outlet,
    items: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableTotal: Math.round(taxableTotal * 100) / 100,
    cgstTotal,
    sgstTotal,
    totalTax: Math.round(totalTax * 100) / 100,
    roundOff,
    grandTotal,
    paymentMethod,
    paymentBreakdown: {
      cash: paymentBreakdown.cash || (paymentMethod === 'Cash' ? grandTotal : 0),
      upi: paymentBreakdown.upi || (paymentMethod === 'UPI' ? grandTotal : 0),
      card: paymentBreakdown.card || (paymentMethod === 'Card' ? grandTotal : 0),
      credit: paymentBreakdown.credit || (paymentMethod === 'Credit' ? grandTotal : 0),
    },
    paymentStatus: paymentMethod === 'Credit' ? 'Unpaid' : 'Paid',
    cashier: user._id,
  });

  // Handle Customer updates: Khata credit balance and Loyalty points
  if (customerId) {
    const customer = await Customer.findById(customerId);
    if (customer) {
      // If credit sale, update outstanding balance
      if (paymentMethod === 'Credit' || (paymentBreakdown.credit && paymentBreakdown.credit > 0)) {
        const creditAmt = paymentMethod === 'Credit' ? grandTotal : paymentBreakdown.credit;
        customer.outstandingBalance += creditAmt;
      }
      // Add loyalty points (1 point per ₹100 spent)
      const earnedPoints = Math.floor(grandTotal / 100);
      customer.loyaltyPoints += earnedPoints;

      // Update refill dates for chronic medicine items
      for (const item of processedItems) {
        const existingRefill = customer.refillReminders.find(
          (r) => r.product && r.product.toString() === item.product.toString()
        );
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30); // 30-day default cycle
        if (existingRefill) {
          existingRefill.lastPurchasedDate = now;
          existingRefill.nextRefillDate = nextDate;
        }
      }

      await customer.save();
    }
  }

  // Record payment entry in cash register
  const receivedImmediate = paymentMethod === 'Credit' ? 0 : grandTotal - (paymentBreakdown.credit || 0);
  if (receivedImmediate > 0) {
    const payCount = await Payment.countDocuments();
    await Payment.create({
      paymentNumber: `PAY-${dateStr}-${String(payCount + 1).padStart(4, '0')}`,
      type: 'IN',
      partyType: customerId ? 'Customer' : 'Other',
      partyId: customerId || undefined,
      partyName: customerName,
      amount: receivedImmediate,
      paymentMethod,
      referenceType: 'SalesInvoice',
      referenceId: salesInvoice._id,
      referenceNumber: invoiceNumber,
      outlet,
      notes: `POS billing collection for invoice ${invoiceNumber}`,
      recordedBy: user._id,
    });
  }

  await logAudit({
    user,
    action: 'POS_CHECKOUT',
    module: 'POS',
    outlet,
    details: {
      invoiceNumber,
      customerName,
      grandTotal,
      paymentMethod,
      itemsCount: items.length,
    },
    req,
  });

  return salesInvoice;
};

export const getSalesInvoices = async ({
  outletId,
  search,
  startDate,
  endDate,
  paymentMethod,
  paymentStatus,
  page = 1,
  limit = 50,
}) => {
  const query = {};
  if (outletId) query.outlet = outletId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await SalesInvoice.countDocuments(query);

  const invoices = await SalesInvoice.find(query)
    .populate('cashier', 'name')
    .populate('customer', 'name phone outstandingBalance loyaltyPoints')
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

export const getSalesInvoiceById = async (id) => {
  const invoice = await SalesInvoice.findById(id)
    .populate('cashier', 'name')
    .populate('customer')
    .populate('outlet')
    .lean();

  if (!invoice) {
    throw new Error('Sales invoice not found');
  }

  return invoice;
};
