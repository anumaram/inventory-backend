const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '/' },
    buttonText: { type: String, default: 'Shop Now' },
    position: {
      type: String,
      enum: ['hero_top', 'mid_page', 'sidebar', 'footer'],
      default: 'hero_top'
    },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

bannerSchema.index({ position: 1, isActive: 1, priority: 1 });

module.exports = mongoose.model('Banner', bannerSchema);

