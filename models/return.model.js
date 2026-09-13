const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'Product' },
    vendorName: { type: String, default: 'Vendor' },
    image: { type: String, default: null },
    qty: { type: Number, default: 1 },
    price: { type: Number, default: 0 }
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    updatedBy: { type: String, default: 'system' }
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => `RET${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(100000 + Math.random() * 900000)}`
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderId: {
      type: String,
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    type: {
      type: String,
      enum: ['return', 'cancellation', 'refund'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: [
        'requested',
        'approved',
        'rejected',
        'pickup_confirmed',
        'pickup_scheduled',
        'picked_up',
        'item_received',
        'quality_passed',
        'refund_initiated',
        'refund_pending',
        'refund_credited',
        'inventory_restored',
        'completed',
        'cancelled'
      ],
      default: 'requested',
      index: true
    },
    reason: {
      type: String,
      required: true
    },
    comments: {
      type: String,
      default: ''
    },
    items: [returnItemSchema],
    totalAmount: {
      type: Number,
      default: 0
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundMethod: {
      type: String,
      default: 'wallet'
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'credited', 'failed'],
      default: 'pending'
    },
    timeline: [timelineEventSchema],
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    isStockRestored: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

returnSchema.index({ customerId: 1, type: 1, createdAt: -1 });
returnSchema.index({ vendorId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);
