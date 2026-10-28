import { Expense, Payment, SalesInvoice, PurchaseInvoice, SalesReturn } from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const recordExpense = async (data, user, req) => {
  const { outlet, category, amount, paymentMethod = 'Cash', description, date } = data;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Expense.countDocuments();
  const expenseNumber = `EXP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  const expense = await Expense.create({
    expenseNumber,
    category,
    amount,
    paymentMethod,
    description,
    date: date || now,
    outlet,
    recordedBy: user._id,
  });

  // Record payment outflow
  const payCount = await Payment.countDocuments();
  await Payment.create({
    paymentNumber: `PAY-${dateStr}-${String(payCount + 1).padStart(4, '0')}`,
    type: 'OUT',
    partyType: 'Expense',
    partyName: category,
    amount,
    paymentMethod,
    referenceType: 'Expense',
    referenceId: expense._id,
    referenceNumber: expenseNumber,
    outlet,
    notes: description || `Operating Expense: ${category}`,
    recordedBy: user._id,
  });

  await logAudit({
    user,
    action: 'RECORD_EXPENSE',
    module: 'Finance',
    outlet,
    details: { expenseNumber, category, amount },
    req,
  });

  return expense;
};

export const getExpenses = async ({ outletId, category, startDate, endDate, page = 1, limit = 50 }) => {
  const query = {};
  if (outletId) query.outlet = outletId;
  if (category) query.category = category;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await Expense.countDocuments(query);

  const expenses = await Expense.find(query)
    .populate('recordedBy', 'name')
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    expenses,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

export const getCashRegisterSummary = async (outletId, date) => {
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  const query = {
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  };

  const payments = await Payment.find(query).lean();

  let cashIn = 0;
  let upiIn = 0;
  let cardIn = 0;
  let cashOut = 0;
  let upiOut = 0;
  let otherOut = 0;

  payments.forEach((p) => {
    if (p.type === 'IN') {
      if (p.paymentMethod === 'Cash') cashIn += p.amount;
      else if (p.paymentMethod === 'UPI') upiIn += p.amount;
      else if (p.paymentMethod === 'Card') cardIn += p.amount;
    } else if (p.type === 'OUT') {
      if (p.paymentMethod === 'Cash') cashOut += p.amount;
      else if (p.paymentMethod === 'UPI') upiOut += p.amount;
      else otherOut += p.amount;
    }
  });

  const netCashInDrawer = cashIn - cashOut;

  return {
    date: startOfDay.toISOString().slice(0, 10),
    cashIn: Math.round(cashIn * 100) / 100,
    upiIn: Math.round(upiIn * 100) / 100,
    cardIn: Math.round(cardIn * 100) / 100,
    totalCollections: Math.round((cashIn + upiIn + cardIn) * 100) / 100,
    cashOut: Math.round(cashOut * 100) / 100,
    upiOut: Math.round(upiOut * 100) / 100,
    otherOut: Math.round(otherOut * 100) / 100,
    totalPayouts: Math.round((cashOut + upiOut + otherOut) * 100) / 100,
    netCashInDrawer: Math.round(netCashInDrawer * 100) / 100,
    transactionsCount: payments.length,
  };
};

export const getProfitAndLoss = async (outletId, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const filter = {
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: start, $lte: end },
  };

  const sales = await SalesInvoice.find(filter).lean();
  const purchases = await PurchaseInvoice.find(filter).lean();
  const expenses = await Expense.find({
    ...(outletId && { outlet: outletId }),
    date: { $gte: start, $lte: end },
  }).lean();
  const returns = await SalesReturn.find(filter).lean();

  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.status !== 'Fully Returned' ? s.grandTotal : 0), 0);
  const totalPurchaseCost = purchases.reduce((acc, p) => acc + p.grandTotal, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalRefunds = returns.reduce((acc, r) => acc + r.totalRefundAmount, 0);

  // Compute Cost of Goods Sold (COGS) based on items sold
  let estimatedCOGS = 0;
  sales.forEach((s) => {
    s.items.forEach((it) => {
      // average retail medicine margin is approx 20-30%, or derived from cost
      const estimatedCost = (it.taxableAmount || it.totalAmount) * 0.75;
      estimatedCOGS += estimatedCost;
    });
  });

  const grossProfit = Math.round((totalSalesRevenue - estimatedCOGS) * 100) / 100;
  const netProfit = Math.round((grossProfit - totalExpenses - totalRefunds) * 100) / 100;

  return {
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
    totalPurchases: Math.round(totalPurchaseCost * 100) / 100,
    estimatedCOGS: Math.round(estimatedCOGS * 100) / 100,
    grossProfit,
    grossMarginPercent: totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 1000) / 10 : 0,
    operatingExpenses: Math.round(totalExpenses * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    netProfit,
  };
};
