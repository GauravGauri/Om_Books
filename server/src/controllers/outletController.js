import { Outlet, AuditLog, Notification } from '../models/index.js';

export const listOutlets = async (req, res, next) => {
  try {
    const outlets = await Outlet.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ success: true, data: outlets });
  } catch (err) {
    next(err);
  }
};

export const createOutlet = async (req, res, next) => {
  try {
    const outlet = await Outlet.create(req.body);
    res.status(201).json({ success: true, data: outlet });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, page = 1, limit = 50 } = req.query;
    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: logs,
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

export const getNotifications = async (req, res, next) => {
  try {
    const { outletId } = req.query;
    const query = {
      ...(outletId && { outlet: outletId }),
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};
