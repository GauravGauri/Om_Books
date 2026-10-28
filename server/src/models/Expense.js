import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      enum: [
        'Rent & Utilities',
        'Electricity & Power',
        'Salaries & Wages',
        'Packaging & Supplies',
        'Software & Internet',
        'Logistics & Courier',
        'Store Maintenance',
        'Marketing & Promotions',
        'Miscellaneous',
      ],
      default: 'Miscellaneous',
    },
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
    date: {
      type: Date,
      default: Date.now,
    },
    description: String,
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
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

export const Expense = mongoose.model('Expense', expenseSchema);
