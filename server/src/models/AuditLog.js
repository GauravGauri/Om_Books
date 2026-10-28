import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
    userRole: String,
    action: {
      type: String,
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: ['Auth', 'Products', 'Inventory', 'Purchases', 'POS', 'Returns', 'Finance', 'Customers', 'Suppliers', 'Settings'],
      required: true,
      index: true,
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
