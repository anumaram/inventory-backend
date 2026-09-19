const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: { type: String, required: true },
    productImage: { type: String, default: '' },
    brand: { type: String, default: 'Brand' },
    serialNumber: { type: String, default: '' },
    purchasedDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, default: Date.now },
    warrantyMonths: { type: Number, default: 12 },
    expiresDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'claimed'],
      default: 'active',
      index: true
    },
    terms: {
      type: [String],
      default: [
        '100% Manufacturer parts & labor coverage',
        'Doorstep inspection & free pickup service',
        'Replacement guaranteed if repair takes > 7 days'
      ]
    },
    certificateId: { type: String, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warranty', warrantySchema);

