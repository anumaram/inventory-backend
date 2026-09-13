const mongoose = require('mongoose');

const wishlistCollectionSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 }
  },
  { timestamps: true }
);

wishlistCollectionSchema.index({ customerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('WishlistCollection', wishlistCollectionSchema);
