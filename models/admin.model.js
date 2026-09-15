const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin', trim: true },
    isDefault: { type: Boolean, default: false },
    mobile: { type: String, trim: true },
    address: { type: String, trim: true },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
