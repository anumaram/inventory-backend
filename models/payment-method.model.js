const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
      required: true
    },
    label: {
      type: String,
      default: ''
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    // Card fields
    cardType: {
      type: String,
      enum: ['credit', 'debit', 'visa', 'mastercard', 'rupay', 'amex', 'card'],
      default: 'card'
    },
    cardNumber: {
      type: String,
      default: ''
    },
    last4: {
      type: String,
      default: ''
    },
    cardHolderName: {
      type: String,
      default: ''
    },
    expiry: {
      type: String,
      default: ''
    },
    // UPI fields
    upiId: {
      type: String,
      default: ''
    },
    // Net banking fields
    bankName: {
      type: String,
      default: ''
    },
    accountNumber: {
      type: String,
      default: ''
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);

