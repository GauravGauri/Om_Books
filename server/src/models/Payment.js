import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true,
    },
    partyType: {
      type: String,
      enum: ['Customer', 'Supplier', 'Expense', 'Other'],
      required: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    partyName: String,
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'],
      default: 'Cash',
    },
    referenceType: {
      type: String,
      enum: ['SalesInvoice', 'PurchaseInvoice', 'SalesReturn', 'PurchaseReturn', 'Expense', 'KhataSettlement'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceNumber: String,
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ outlet: 1, type: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
