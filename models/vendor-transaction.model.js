const mongoose = require('mongoose');

const vendorTransactionSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['order_earning', 'refund_deduction', 'payout', 'platform_fee', 'adjustment'],
      required: true
    },
    amount: { type: Number, required: true },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    status: {
      type: String,
      enum: ['completed', 'pending', 'processing', 'failed'],
      default: 'completed'
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderDisplayId: { type: String, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: '' },
    commission: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    payoutMethod: { type: String, default: 'bank_transfer' },
    payoutAccount: { type: String, default: '' },
    description: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

vendorTransactionSchema.index({ vendorId: 1, createdAt: -1 });
vendorTransactionSchema.index({ vendorId: 1, type: 1, createdAt: -1 });
vendorTransactionSchema.index({ orderId: 1 });

module.exports = mongoose.model('VendorTransaction', vendorTransactionSchema);

