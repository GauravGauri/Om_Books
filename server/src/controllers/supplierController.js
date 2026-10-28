import {
  getSuppliers,
  createSupplier,
  recordSupplierPayment,
  getSupplierHistory,
} from '../services/supplierService.js';
import { Supplier } from '../models/index.js';

export const listSuppliers = async (req, res, next) => {
  try {
    const result = await getSuppliers(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const addSupplier = async (req, res, next) => {
  try {
    const supplier = await createSupplier(req.body, req.user, req);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

export const updateSupplierDetails = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

export const paySupplierKhata = async (req, res, next) => {
  try {
    const result = await recordSupplierPayment(
      { supplierId: req.params.id, ...req.body },
      req.user,
      req
    );
    res.json({ success: true, message: 'Supplier payment recorded successfully', data: result });
  } catch (err) {
    next(err);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await getSupplierHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
