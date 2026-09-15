const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      default: '',
      trim: true
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'approved'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
