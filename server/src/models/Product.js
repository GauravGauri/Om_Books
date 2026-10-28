import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic composition/name is required'],
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    hsnCode: {
      type: String,
      default: '3004',
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manufacturer',
      required: true,
    },
    dosageForm: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Suspension', 'Powder', 'Other'],
      default: 'Tablet',
    },
    strength: {
      type: String,
      trim: true,
    },
    packSize: {
      type: String,
      default: '10 Tablets / Strip',
    },
    uom: {
      type: String,
      enum: ['Strip', 'Bottle', 'Box', 'Vial', 'Tube', 'Piece', 'Pack'],
      default: 'Strip',
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 12,
    },
    minStockLevel: {
      type: Number,
      default: 15,
      min: 0,
    },
    reorderQuantity: {
      type: Number,
      default: 50,
      min: 1,
    },
    isPrescriptionRequired: {
      type: Boolean,
      default: false,
    },
    scheduleType: {
      type: String,
      enum: ['OTC', 'Schedule H', 'Schedule H1', 'Schedule X', 'Schedule G'],
      default: 'OTC',
    },
    status: {
      type: String,
      enum: ['Active', 'Discontinued', 'Archived'],
      default: 'Active',
    },
    image: String,
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 'text', genericName: 'text', brand: 'text' });

export const Product = mongoose.model('Product', productSchema);
