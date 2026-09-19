const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    house: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    saveAs: { type: String, default: '', trim: true },
    formattedAddress: { type: String, default: '', trim: true },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

addressSchema.index({ customerId: 1, isDeleted: 1 });

module.exports = mongoose.model('Address', addressSchema);
