const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },
    bannerImage: { type: String, default: '' },
    discountPercent: { type: Number, default: 10 },
    badgeText: { type: String, default: 'SALE' },
    targetCategory: { type: String, default: 'All' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

promotionSchema.index({ isActive: 1, endDate: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);

