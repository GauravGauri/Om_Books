import jwt from 'jsonwebtoken';
import { User, Outlet, AuditLog } from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const generateTokens = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_homebooks_pharmacy_erp_2026';
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'super_secret_refresh_key_homebooks_2026';

  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    refreshSecret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

  return { token, refreshToken };
};

export const loginUser = async ({ email, password, req }) => {
  const user = await User.findOne({ email }).select('+password').populate('outlets');
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Please contact administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  user.lastLogin = new Date();
  await user.save();

  const { token, refreshToken } = generateTokens(user);

  await logAudit({
    user,
    action: 'USER_LOGIN',
    module: 'Auth',
    outlet: user.outlets?.[0]?._id,
    details: { email: user.email, role: user.role },
    req,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      outlets: user.outlets,
    },
    token,
    refreshToken,
  };
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId).populate('outlets');
  if (!user) {
    throw new Error('User not found');
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    outlets: user.outlets,
  };
};
