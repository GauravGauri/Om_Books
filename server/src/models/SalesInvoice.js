import mongoose from 'mongoose';

const salesInvoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  genericName: String,
  hsnCode: String,
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryBatch',
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  // Supports decimal/fractional packs (e.g. 0.7 strip for 7 tabs of a 10 tab strip)
  quantity: {
    type: Number,
    required: true,
    min: 0.0001,
  },
  isLoose: {
    type: Boolean,
    default: false,
  },
  unitType: {
    type: String,
    default: 'Strip',
  },
  unitsPerPack: {
    type: Number,
    default: 1,
  },
  packQuantity: {
    type: Number,
  },
  looseQuantity: {
    type: Number,
  },
  perUnitRate: {
    type: Number,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  mrp: {
    type: Number,
    required: true,
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    default: 12,
  },
  taxableAmount: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  returnedQuantity: {
    type: Number,
    default: 0,
  },
});

const salesInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
    },
    customerPhone: {
      type: String,
    },
    doctorName: {
      type: String,
      trim: true,
    },
    prescriptionNumber: {
      type: String,
      trim: true,
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    items: [salesInvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    taxableTotal: {
      type: Number,
      required: true,
    },
    cgstTotal: {
      type: Number,
      default: 0,
    },
    sgstTotal: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Credit', 'Split'],
      default: 'Cash',
    },
    paymentBreakdown: {
      cash: { type: Number, default: 0 },
      upi: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid'],
      default: 'Paid',
    },
    status: {
      type: String,
      enum: ['Completed', 'Partially Returned', 'Fully Returned', 'Cancelled'],
      default: 'Completed',
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

salesInvoiceSchema.index({ outlet: 1, createdAt: -1 });

export const SalesInvoice = mongoose.model('SalesInvoice', salesInvoiceSchema);
