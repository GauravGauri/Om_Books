import { checkoutPOS, getSalesInvoices, getSalesInvoiceById } from '../services/posService.js';

export const checkout = async (req, res, next) => {
  try {
    const invoice = await checkoutPOS(req.body, req.user, req);
    res.status(201).json({
      success: true,
      message: 'Checkout complete. Bill generated successfully.',
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const listInvoices = async (req, res, next) => {
  try {
    const result = await getSalesInvoices(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await getSalesInvoiceById(req.params.id);
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};
