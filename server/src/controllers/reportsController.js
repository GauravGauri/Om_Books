import {
  getDashboardKPIs,
  getGstReport,
  getScheduleH1Report,
  getExpiryAuditReport,
} from '../services/reportsService.js';

export const getDashboard = async (req, res, next) => {
  try {
    const data = await getDashboardKPIs(req.query.outletId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getGst = async (req, res, next) => {
  try {
    const data = await getGstReport(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getScheduleH1 = async (req, res, next) => {
  try {
    const data = await getScheduleH1Report(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExpiryAudit = async (req, res, next) => {
  try {
    const data = await getExpiryAuditReport(req.query.outletId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
