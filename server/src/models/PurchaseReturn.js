import mongoose from 'mongoose';

const purchaseReturnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryBatch',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitCost: {
    type: Number,
    required: true,
  },
  refundAmount: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    enum: ['Expired', 'Damaged', 'Wrong Item', 'Overstocked', 'Recall'],
    default: 'Expired',
  },
});

const purchaseReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    originalPurchaseInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseInvoice',
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    items: [purchaseReturnItemSchema],
    totalRefund: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Completed'],
      default: 'Completed',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PurchaseReturn = mongoose.model('PurchaseReturn', purchaseReturnSchema);
