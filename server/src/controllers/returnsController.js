import { processSalesReturn, getSalesReturns } from '../services/returnsService.js';

export const handleSalesReturn = async (req, res, next) => {
  try {
    const sReturn = await processSalesReturn(req.body, req.user, req);
    res.status(201).json({
      success: true,
      message: 'Sales return processed successfully',
      data: sReturn,
    });
  } catch (err) {
    next(err);
  }
};

export const listSalesReturns = async (req, res, next) => {
  try {
    const result = await getSalesReturns(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
