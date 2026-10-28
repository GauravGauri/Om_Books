import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Supplier company name is required'],
      trim: true,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Supplier phone is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: String,
    city: String,
    state: {
      type: String,
      default: 'Karnataka',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    dlNumber: {
      type: String,
      trim: true,
    },
    paymentTerms: {
      type: String,
      default: '30 Days Net',
    },
    outstandingBalance: {
      type: Number,
      default: 0, // positive means we owe supplier
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Supplier = mongoose.model('Supplier', supplierSchema);
