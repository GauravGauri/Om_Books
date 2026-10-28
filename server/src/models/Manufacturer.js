import mongoose from 'mongoose';

const manufacturerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    shortName: String,
    country: {
      type: String,
      default: 'India',
    },
    contactEmail: String,
    contactPhone: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Manufacturer = mongoose.model('Manufacturer', manufacturerSchema);
