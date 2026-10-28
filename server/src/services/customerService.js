import { Customer, Payment, SalesInvoice } from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const getCustomers = async ({ search, hasOutstanding, page = 1, limit = 50 }) => {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (hasOutstanding === 'true' || hasOutstanding === true) {
    query.outstandingBalance = { $gt: 0 };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await Customer.countDocuments(query);

  const customers = await Customer.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    customers,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

export const createCustomer = async (data, user, req) => {
  const existing = await Customer.findOne({ phone: data.phone });
  if (existing) {
    throw new Error(`Customer with phone ${data.phone} already exists`);
  }

  const customer = await Customer.create(data);

  await logAudit({
    user,
    action: 'CREATE_CUSTOMER',
    module: 'Customers',
    details: { customerId: customer._id, name: customer.name, phone: customer.phone },
    req,
  });

  return customer;
};

export const recordCustomerKhataPayment = async (
  { customerId, amount, paymentMethod = 'Cash', notes, outletId },
  user,
  req
) => {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  customer.outstandingBalance = Math.max(0, customer.outstandingBalance - amount);
  await customer.save();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Payment.countDocuments();
  const paymentNumber = `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  const payment = await Payment.create({
    paymentNumber,
    type: 'IN',
    partyType: 'Customer',
    partyId: customer._id,
    partyName: customer.name,
    amount,
    paymentMethod,
    referenceType: 'KhataSettlement',
    outlet: outletId,
    notes: notes || `Customer Khata settlement payment`,
    recordedBy: user._id,
  });

  await logAudit({
    user,
    action: 'CUSTOMER_PAYMENT',
    module: 'Finance',
    outlet: outletId,
    details: { customerId: customer._id, amount, paymentNumber },
    req,
  });

  return { customer, payment };
};

export const getCustomerHistory = async (customerId) => {
  const [invoices, payments] = await Promise.all([
    SalesInvoice.find({ customer: customerId }).sort({ createdAt: -1 }).lean(),
    Payment.find({ partyId: customerId }).sort({ createdAt: -1 }).lean(),
  ]);

  return { invoices, payments };
};
