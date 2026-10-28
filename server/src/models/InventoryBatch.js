import mongoose from 'mongoose';

const inventoryBatchSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    mfgDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    purchaseCost: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    locationRack: {
      type: String,
      trim: true,
      default: 'Rack A-1',
    },
    status: {
      type: String,
      enum: ['Available', 'Low Stock', 'Expired', 'Quarantined', 'Depleted'],
      default: 'Available',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for ultra-fast FEFO (First-Expiry, First-Out) queries
inventoryBatchSchema.index({ product: 1, outlet: 1, expiryDate: 1 });
inventoryBatchSchema.index({ outlet: 1, expiryDate: 1, availableQuantity: 1 });

export const InventoryBatch = mongoose.model('InventoryBatch', inventoryBatchSchema);
