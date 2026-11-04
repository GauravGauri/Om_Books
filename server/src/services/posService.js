import {
  SalesInvoice,
  InventoryBatch,
  StockMovement,
  Customer,
  Product,
  Payment,
  Notification,
  Outlet,
} from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const checkoutPOS = async (data, user, req) => {
  let outletId = data.outlet || data.outletId;
  if (!outletId && user?.outlets && user.outlets.length > 0) {
    outletId = user.outlets[0]._id || user.outlets[0];
  }
  if (!outletId) {
    const defaultOutlet = await Outlet.findOne({ isActive: true });
    outletId = defaultOutlet?._id;
  }
  if (!outletId) {
    let anyOutlet = await Outlet.findOne({});
    if (!anyOutlet) {
      anyOutlet = await Outlet.create({
        name: 'HomeBooks Central Pharmacy',
        code: 'OUT-MAIN',
        address: '100 Feet Rd, Indiranagar',
        city: 'Bengaluru',
        isMain: true,
      });
    }
    outletId = anyOutlet._id;
  }

  const outlet = outletId;

  const {
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

  // Validate and deduct stock for each item (supports Marg ERP loose/fractional dispensing)
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

    // Loose dispensing logic (Marg ERP style)
    const isLoose = Boolean(item.isLoose);
    const unitsPerPack = Number(item.unitsPerPack || batch.product?.unitsPerPack || 10);
    const defaultLooseUnit = batch.product?.dosageForm === 'Capsule' ? 'Cap' : batch.product?.dosageForm === 'Respule' ? 'Respule' : 'Tab';
    const unitType = item.unitType || (isLoose ? defaultLooseUnit : (batch.product?.uom || 'Strip'));

    let packQty = 0;
    let looseQty = 0;
    let unitPrice = 0;
    let lineGross = 0;
    let perUnitRate = 0;

    if (isLoose) {
      // Loose dispensing in tabs/capsules/respules
      if (item.looseQuantity != null && item.looseQuantity > 0) {
        looseQty = Number(item.looseQuantity);
        packQty = Math.round((looseQty / unitsPerPack) * 10000) / 10000;
      } else {
        packQty = Number(item.quantity || 0);
        looseQty = Math.round(packQty * unitsPerPack);
      }

      perUnitRate = item.unitPrice || Math.round(((batch.sellingPrice || batch.product?.sellingPrice || 0) / unitsPerPack) * 100) / 100;
      unitPrice = perUnitRate;
      lineGross = Math.round(unitPrice * looseQty * 100) / 100;
    } else {
      // Full pack dispensing (strips, bottles, packets, etc.)
      packQty = Number(item.quantity || 1);
      looseQty = Math.round(packQty * unitsPerPack);
      unitPrice = item.unitPrice || batch.sellingPrice || batch.product?.sellingPrice || 0;
      perUnitRate = Math.round((unitPrice / unitsPerPack) * 100) / 100;
      lineGross = Math.round(unitPrice * packQty * 100) / 100;
    }

    // Safety: check stock availability
    if (batch.availableQuantity < packQty) {
      const availLoose = Math.floor(batch.availableQuantity * unitsPerPack);
      throw new Error(
        `Insufficient stock for ${batch.product.name} (Batch: ${batch.batchNumber}). Requested: ${isLoose ? `${looseQty} ${unitType}` : `${packQty} packs`}, Available: ${batch.availableQuantity} packs (${availLoose} ${unitType})`
      );
    }

    // Deduct batch stock
    const prevQty = batch.availableQuantity;
    batch.availableQuantity = Math.max(0, Math.round((batch.availableQuantity - packQty) * 10000) / 10000);
    if (batch.availableQuantity <= 0.0001) {
      batch.availableQuantity = 0;
      batch.status = 'Depleted';
    }
    await batch.save();

    // Line financials
    const discountPct = Number(item.discountPercent || customDiscountPercent || 0);
    const itemDiscount = Math.round(((lineGross * discountPct) / 100) * 100) / 100;
    const taxableAmount = Math.round((lineGross - itemDiscount) * 100) / 100;
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
      quantity: -packQty,
      previousQuantity: prevQty,
      newQuantity: batch.availableQuantity,
      referenceType: 'SalesInvoice',
      referenceNumber: invoiceNumber,
      remarks: isLoose
        ? `POS Loose Sale: ${looseQty} ${unitType} (${packQty} packs) to ${customerName}`
        : `POS Sale to ${customerName}`,
      performedBy: user._id,
    });

    processedItems.push({
      product: batch.product._id,
      productName: batch.product.name,
      genericName: batch.product.genericName,
      hsnCode: item.hsnCode || batch.product.hsnCode || '3004',
      batch: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: packQty,
      isLoose,
      unitType,
      unitsPerPack,
      packQuantity: packQty,
      looseQuantity: looseQty,
      perUnitRate,
      unitPrice,
      mrp: isLoose ? Math.round((batch.mrp / unitsPerPack) * 100) / 100 : batch.mrp,
      discountPercent: discountPct,
      taxableAmount,
      gstRate,
      taxAmount: itemTax,
      totalAmount: lineTotal,
    });

    // Check low stock threshold & trigger notification
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

  // If customer khata credit used, update customer ledger balance & loyalty points
  if (customerId) {
    const customerRecord = await Customer.findById(customerId);
    if (customerRecord) {
      const earnedPoints = Math.floor(grandTotal / 100); // 1 pt per ₹100
      customerRecord.loyaltyPoints = (customerRecord.loyaltyPoints || 0) + earnedPoints;

      if (paymentMethod === 'Credit' || (paymentBreakdown.credit && paymentBreakdown.credit > 0)) {
        const creditAmt = paymentMethod === 'Credit' ? grandTotal : paymentBreakdown.credit;
        customerRecord.outstandingBalance = (customerRecord.outstandingBalance || 0) + creditAmt;
      }
      await customerRecord.save();
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
