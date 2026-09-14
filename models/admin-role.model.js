const mongoose = require('mongoose');

const adminRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    permissions: {
      dashboard: { type: Boolean, default: true },
      customers: { type: Boolean, default: true },
      vendors: { type: Boolean, default: true },
      products: { type: Boolean, default: true },
      orders: { type: Boolean, default: true },
      inventory: { type: Boolean, default: true },
      financials: { type: Boolean, default: true },
      marketing: { type: Boolean, default: true },
      support: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      settings: { type: Boolean, default: false }
    },
    userCount: { type: Number, default: 0 },
    isSystemRole: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

adminRoleSchema.index({ slug: 1 });

module.exports = mongoose.model('AdminRole', adminRoleSchema);

