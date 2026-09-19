const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
      index: true
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: 'male'
    },
    bodyType: {
      type: String,
      enum: ['slim', 'athletic', 'regular'],
      default: 'athletic'
    },
    heightCm: { type: Number, default: 175 },
    skinTone: { type: String, default: '#E0AC69' }, // Hex color
    hairStyle: { type: String, default: 'short_crop' },
    hairColor: { type: String, default: '#1a1a1a' },
    currentOutfit: {
      top: { type: mongoose.Schema.Types.Mixed, default: null },
      bottom: { type: mongoose.Schema.Types.Mixed, default: null },
      shoes: { type: mongoose.Schema.Types.Mixed, default: null },
      dress: { type: mongoose.Schema.Types.Mixed, default: null },
      outerwear: { type: mongoose.Schema.Types.Mixed, default: null },
      accessory: { type: mongoose.Schema.Types.Mixed, default: null },
      bag: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    savedLooks: [
      {
        name: { type: String, required: true },
        occasion: {
          type: String,
          default: 'casual'
        },
        gender: { type: String, default: 'male' },
        items: [
          {
            _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
            id: { type: String },
            productId: { type: mongoose.Schema.Types.Mixed },
            category: { type: String },
            clothingType: { type: String },
            name: { type: String },
            price: { type: Number, default: 0 },
            image: { type: String },
            color: { type: String },
            avatarColor: { type: String },
            avatarTemplateId: { type: String },
            brand: { type: String },
            fitProfile: { type: String },
            isAvatarItem: { type: Boolean, default: false }
          }
        ],
        totalPrice: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Avatar', avatarSchema);

