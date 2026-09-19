const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WishlistCollection', required: true, index: true },
    category: { type: String, default: 'Others', trim: true, index: true },
    addedPrice: { type: Number, default: 0 },
    notifyBackInStock: { type: Boolean, default: true },
    notifyPriceDrop: { type: Boolean, default: true },
    lastNotifiedPrice: { type: Number, default: 0 },
    lastNotifiedStock: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

wishlistSchema.index({ customerId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
