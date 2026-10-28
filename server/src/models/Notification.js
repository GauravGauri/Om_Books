import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['LOW_STOCK', 'EXPIRY_WARNING', 'PURCHASE_ORDER', 'PAYMENT_DUE', 'SYSTEM'],
      default: 'SYSTEM',
    },
    link: String,
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ outlet: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
