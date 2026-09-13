const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    phone: { type: String, default: '' },
    gender: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    paymentMethods: [
      {
        type: { type: String, enum: ['upi', 'card', 'netbanking', 'wallet'] },
        upiId: String,
        bankName: String,
        accountName: String,
        accountNumber: String,
        ifsc: String,
        cardholderName: String,
        last4: String,
        expiryMonth: String,
        expiryYear: String,
        cardBrand: String,
        walletName: String,
        isDefault: { type: Boolean, default: false }
      }
    ],
    wallet: {
      balance: { type: Number, default: 0, min: 0 }
    },
    otp: {
      code: { type: String, default: '' },
      purpose: { type: String, default: '' },
      expiresAt: { type: Date, default: null }
    },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
