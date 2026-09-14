const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const inventoryTransferSchema = new mongoose.Schema(
  {
    transferId: { type: String, required: true, unique: true },
    fromWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    toWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    items: [transferItemSchema],
    totalQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'completed', 'cancelled'],
      default: 'pending'
    },
    initiatedBy: { type: String, default: 'Admin' },
    notes: { type: String, default: '' },
    dispatchedAt: Date,
    receivedAt: Date
  },
  { timestamps: true }
);

inventoryTransferSchema.index({ transferId: 1 });
inventoryTransferSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransfer', inventoryTransferSchema);

