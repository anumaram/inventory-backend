const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
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
      required: true
    },
    productName: { type: String, required: true },
    productImage: { type: String, default: '' },
    price: { type: Number, required: true },
    unit: { type: String, default: '1 Unit' },
    quantity: { type: Number, default: 1, min: 1 },
    frequencyDays: { type: Number, default: 30 }, // 7, 15, 30, 60, custom
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    lastPurchasedDate: { type: Date, default: Date.now },
    nextDeliveryDate: { type: Date, required: true, index: true },
    remindDaysBefore: { type: Number, default: 3 },
    remindersEnabled: { type: Boolean, default: true },
    deliveryAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    paymentMethod: { type: String, default: 'wallet' },
    deliveryCount: { type: Number, default: 1 },
    history: [
      {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        deliveredAt: { type: Date, default: Date.now },
        amount: { type: Number }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);

