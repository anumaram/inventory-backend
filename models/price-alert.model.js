const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    targetPrice: { type: Number, required: true },
    currentPriceAtSet: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    triggered: { type: Boolean, default: false },
    triggeredAt: { type: Date }
  },
  { timestamps: true }
);

priceAlertSchema.index({ customerId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('PriceAlert', priceAlertSchema);

