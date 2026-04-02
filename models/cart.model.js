const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, default: 1, min: 1 },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

cartSchema.index({ customerId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
