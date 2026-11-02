import mongoose from 'mongoose';

const purchaseInvoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  itemType: {
    type: String,
    trim: true,
    default: 'Tablet',
  },
  hsnCode: {
    type: String,
    trim: true,
    default: '3004',
  },
  batchNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  packSize: {
    type: String,
    trim: true,
    default: '10 Tablets / Strip',
  },
  mfgDate: Date,
  expiryDate: {
    type: Date,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  freeQuantity: {
    type: Number,
    default: 0,
  },
  purchasePrice: {
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
  discountPercent: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    default: 12,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryBatch',
  },
});

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    purchaseType: {
      type: String,
      enum: ['Invoice', 'Delivery Challan'],
      default: 'Invoice',
    },
    billHasGst: {
      type: Boolean,
      default: true,
    },
    supplierInvoiceNumber: {
      type: String,
      trim: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    items: [purchaseInvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
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
    paidAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
    },
    status: {
      type: String,
      enum: ['Received', 'Cancelled', 'Returned'],
      default: 'Received',
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

export const PurchaseInvoice = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
