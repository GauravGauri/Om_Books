import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      required: true,
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: [
        'PURCHASE_IN',
        'SALE_OUT',
        'RETURN_IN',
        'RETURN_OUT',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'ADJUSTMENT',
        'DAMAGE_WRITEOFF',
        'EXPIRY_WRITEOFF',
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: [
        'SalesInvoice',
        'PurchaseInvoice',
        'GoodsReceipt',
        'SalesReturn',
        'PurchaseReturn',
        'AuditReconciliation',
        'StockTransfer',
        'ManualAdjustment',
      ],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceNumber: {
      type: String,
    },
    remarks: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
