const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

addressSchema.index({ customerId: 1, isDeleted: 1 });

module.exports = mongoose.model('Address', addressSchema);
