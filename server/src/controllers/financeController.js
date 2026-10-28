import {
  recordExpense,
  getExpenses,
  getCashRegisterSummary,
  getProfitAndLoss,
} from '../services/financeService.js';
import { Payment } from '../models/index.js';

export const addExpense = async (req, res, next) => {
  try {
    const expense = await recordExpense(req.body, req.user, req);
    res.status(201).json({ success: true, message: 'Expense recorded', data: expense });
  } catch (err) {
    next(err);
  }
};

export const listExpenses = async (req, res, next) => {
  try {
    const result = await getExpenses(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getCashRegister = async (req, res, next) => {
  try {
    const summary = await getCashRegisterSummary(req.query.outletId, req.query.date);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

export const getPLStatement = async (req, res, next) => {
  try {
    const pl = await getProfitAndLoss(req.query.outletId, req.query.startDate, req.query.endDate);
    res.json({ success: true, data: pl });
  } catch (err) {
    next(err);
  }
};

export const listPayments = async (req, res, next) => {
  try {
    const { outletId, type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (outletId) query.outlet = outletId;
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Payment.countDocuments(query);

    const payments = await Payment.find(query)
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: payments,
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
