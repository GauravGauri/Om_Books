import {
  createPurchaseOrder,
  receiveGoodsInvoice,
  processPurchaseReturn,
  getPurchaseInvoices,
  getPurchaseOrders,
} from '../services/purchaseService.js';
import { PurchaseOrder } from '../models/index.js';

export const listPurchaseOrders = async (req, res, next) => {
  try {
    const result = await getPurchaseOrders(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const addPurchaseOrder = async (req, res, next) => {
  try {
    const po = await createPurchaseOrder(req.body, req.user, req);
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, data: po });
  } catch (err) {
    next(err);
  }
};

export const listPurchaseInvoices = async (req, res, next) => {
  try {
    const result = await getPurchaseInvoices(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const receiveGoods = async (req, res, next) => {
  try {
    const invoice = await receiveGoodsInvoice(req.body, req.user, req);
    res.status(201).json({ success: true, message: 'Goods received and inventory updated', data: invoice });
  } catch (err) {
    next(err);
  }
};

export const returnPurchase = async (req, res, next) => {
  try {
    const pReturn = await processPurchaseReturn(req.body, req.user, req);
    res.json({ success: true, message: 'Purchase return completed and supplier ledger adjusted', data: pReturn });
  } catch (err) {
    next(err);
  }
};
