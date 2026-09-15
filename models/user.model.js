const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: { type: String, default: '' },
  businessName: { type: String, default: '' },
  status: { type: String, enum: ['active', 'suspended', 'pending_approval'], default: 'active' },
  otp: {
    code: { type: String, default: '' },
    purpose: { type: String, default: '' },
    expiresAt: { type: Date, default: null }
  },
  vendorSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
