import mongoose from 'mongoose';

const salesReturnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: String,
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryBatch',
    required: true,
  },
  batchNumber: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  refundAmount: {
    type: Number,
    required: true,
  },
  condition: {
    type: String,
    enum: ['Sellable', 'Damaged', 'Expired'],
    default: 'Sellable',
  },
});

const salesReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
    },
    originalInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      required: true,
    },
    originalInvoiceNumber: String,
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: String,
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    items: [salesReturnItemSchema],
    totalRefundAmount: {
      type: Number,
      required: true,
    },
    refundMethod: {
      type: String,
      enum: ['Cash', 'Khata Credit', 'UPI'],
      default: 'Cash',
    },
    reason: {
      type: String,
      default: 'Doctor changed prescription',
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SalesReturn = mongoose.model('SalesReturn', salesReturnSchema);
