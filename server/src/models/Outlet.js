import mongoose from 'mongoose';

const outletSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Outlet name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Outlet code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      default: 'Karnataka',
    },
    pincode: {
      type: String,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    drugLicenseNumber: {
      type: String,
      default: 'DL-2026-KA-4982',
    },
    gstin: {
      type: String,
      default: '29ABCDE1234F1Z5',
    },
    isMain: {
      type: Boolean,
      default: false,
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

export const Outlet = mongoose.model('Outlet', outletSchema);
