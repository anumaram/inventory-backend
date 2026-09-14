const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  type: {
    type: String,
    enum: ['payment', 'refund', 'wallet_topup', 'wallet_debit', 'wallet_credit'],
    required: true
  },
  amount: { type: Number, required: true },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  status: { type: String, enum: ['success', 'pending', 'failed', 'processed'], default: 'success' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderDisplayId: { type: String, default: '' },
  description: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ customerId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

