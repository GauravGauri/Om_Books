import jwt from 'jsonwebtoken';
import { User, AuditLog } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing. Please sign in.',
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_homebooks_pharmacy_erp_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated or does not exist.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.',
      error: err.message,
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    // Super Admin has universal access
    if (req.user.role === 'Super Admin') {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to perform this operation.`,
      });
    }
    next();
  };
};

export const logAudit = async ({ user, action, module, outlet, details, req }) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    await AuditLog.create({
      user: user?._id,
      userName: user?.name || 'System',
      userRole: user?.role || 'System',
      action,
      module,
      outlet,
      details,
      ipAddress,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
};
