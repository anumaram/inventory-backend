const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'PRODUCT_CREATED',
        'STOCK_ADJUSTMENT',
        'ORDER_PLACED',
        'ORDER_CANCELLED',
        'ORDER_RETURNED',
        'PRODUCT_EDITED',
        'PRODUCT_DELETED'
      ],
      required: true,
      index: true
    },
    quantityChange: {
      type: Number,
      required: true // e.g. +20, -2, +5, 0 (for edits)
    },
    stockBefore: {
      type: Number,
      required: true
    },
    stockAfter: {
      type: Number,
      required: true
    },
    referenceId: {
      type: String,
      default: '',
      trim: true // e.g., 'ORD-8921', 'INV-8921', 'RESTOCK-1'
    },
    reason: {
      type: String,
      default: '',
      trim: true // e.g., 'Initial inventory added', 'Customer order #ORD-8921', 'Manual stock addition'
    },
    actor: {
      type: String,
      default: 'Vendor',
      trim: true // 'Vendor', 'Customer', 'System', 'Admin'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast timeline queries
inventoryHistorySchema.index({ productId: 1, createdAt: -1 });
inventoryHistorySchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);

