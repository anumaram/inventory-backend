const mongoose = require('mongoose');

const warrantyClaimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, unique: true, index: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    warrantyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warranty',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: { type: String, required: true },
    productImage: { type: String, default: '' },
    serviceType: {
      type: String,
      enum: ['repair', 'replacement', 'exchange'],
      default: 'repair'
    },
    issueDescription: { type: String, required: true },
    issueCategory: { type: String, default: 'Hardware Defect' },
    pickupSlot: { type: String, default: '' },
    serialNumber: { type: String, default: '' },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    technicianName: { type: String, default: '' },
    technicianPhone: { type: String, default: '' },
    inspectionNotes: { type: String, default: '' },
    resolutionType: {
      type: String,
      enum: ['repair', 'replacement', 'exchange', 'rejected', ''],
      default: ''
    },
    resolutionNotes: { type: String, default: '' },
    photos: { type: [String], default: [] },
    pickupAddress: { type: String, default: '' },
    status: {
      type: String,
      enum: ['submitted', 'pickup_scheduled', 'in_inspection', 'approved', 'resolved', 'rejected'],
      default: 'submitted'
    },
    timeline: [
      {
        status: { type: String },
        note: { type: String },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('WarrantyClaim', warrantyClaimSchema);

