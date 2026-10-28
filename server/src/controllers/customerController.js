import {
  getCustomers,
  createCustomer,
  recordCustomerKhataPayment,
  getCustomerHistory,
} from '../services/customerService.js';
import { Customer } from '../models/index.js';

export const listCustomers = async (req, res, next) => {
  try {
    const result = await getCustomers(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const addCustomer = async (req, res, next) => {
  try {
    const customer = await createCustomer(req.body, req.user, req);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const updateCustomerDetails = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const payCustomerKhata = async (req, res, next) => {
  try {
    const result = await recordCustomerKhataPayment(
      { customerId: req.params.id, ...req.body },
      req.user,
      req
    );
    res.json({ success: true, message: 'Khata payment recorded successfully', data: result });
  } catch (err) {
    next(err);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await getCustomerHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
