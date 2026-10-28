import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    patientName: {
      type: String,
      required: true,
    },
    doctorName: {
      type: String,
      required: true,
    },
    hospitalOrClinic: String,
    date: {
      type: Date,
      default: Date.now,
    },
    medicinesPrescribed: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        medicineName: String,
        dosage: String,
        durationDays: Number,
      },
    ],
    notes: String,
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    dispensedStatus: {
      type: String,
      enum: ['Pending', 'Partially Dispensed', 'Dispensed'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
