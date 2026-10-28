import { Supplier, Payment, PurchaseInvoice, PurchaseReturn } from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const getSuppliers = async ({ search, hasBalance, page = 1, limit = 50 }) => {
  const query = {};

  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { gstin: { $regex: search, $options: 'i' } },
    ];
  }

  if (hasBalance === 'true' || hasBalance === true) {
    query.outstandingBalance = { $gt: 0 };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await Supplier.countDocuments(query);

  const suppliers = await Supplier.find(query)
    .sort({ companyName: 1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    suppliers,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

export const createSupplier = async (data, user, req) => {
  const existing = await Supplier.findOne({
    $or: [
      { companyName: data.companyName },
      ...(data.gstin ? [{ gstin: data.gstin }] : []),
    ],
  });

  if (existing) {
    throw new Error(`Supplier with this company name or GSTIN already exists`);
  }

  const supplier = await Supplier.create(data);

  await logAudit({
    user,
    action: 'CREATE_SUPPLIER',
    module: 'Suppliers',
    details: { supplierId: supplier._id, companyName: supplier.companyName },
    req,
  });

  return supplier;
};

export const recordSupplierPayment = async (
  { supplierId, amount, paymentMethod = 'Bank Transfer', notes, outletId },
  user,
  req
) => {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new Error('Supplier not found');
  }

  supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - amount);
  await supplier.save();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Payment.countDocuments();
  const paymentNumber = `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  const payment = await Payment.create({
    paymentNumber,
    type: 'OUT',
    partyType: 'Supplier',
    partyId: supplier._id,
    partyName: supplier.companyName,
    amount,
    paymentMethod,
    referenceType: 'KhataSettlement',
    outlet: outletId,
    notes: notes || `Payment disbursed to supplier`,
    recordedBy: user._id,
  });

  await logAudit({
    user,
    action: 'SUPPLIER_PAYMENT',
    module: 'Finance',
    outlet: outletId,
    details: { supplierId: supplier._id, amount, paymentNumber },
    req,
  });

  return { supplier, payment };
};

export const getSupplierHistory = async (supplierId) => {
  const [invoices, payments, returns] = await Promise.all([
    PurchaseInvoice.find({ supplier: supplierId }).sort({ createdAt: -1 }).lean(),
    Payment.find({ partyId: supplierId }).sort({ createdAt: -1 }).lean(),
    PurchaseReturn.find({ supplier: supplierId }).sort({ createdAt: -1 }).lean(),
  ]);

  return { invoices, payments, returns };
};
