import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: String,
    doctorName: String,
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0, // positive means customer owes store (Khata credit)
    },
    chronicConditions: [String],
    refillReminders: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        productName: String,
        lastPurchasedDate: Date,
        dosageFrequency: String,
        refillIntervalDays: {
          type: Number,
          default: 30,
        },
        nextRefillDate: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Customer = mongoose.model('Customer', customerSchema);
