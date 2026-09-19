const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  answer: { type: String, required: true, trim: true },
  answeredBy: {
    name: { type: String, default: 'Customer' },
    role: { type: String, enum: ['customer', 'seller', 'system', 'admin'], default: 'customer' },
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  badge: {
    type: String,
    enum: ['✓ Verified Specification', '✓ Verified Seller', '✓ Verified Buyer', 'Official Merchant', 'Customer'],
    default: 'Customer'
  },
  isVerified: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  unhelpfulCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const productQASchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    askedBy: {
      name: { type: String, default: 'Anonymous Customer' },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      isVerifiedBuyer: { type: Boolean, default: false }
    },
    answers: {
      type: [answerSchema],
      default: []
    },
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    isCommonSpec: {
      type: Boolean,
      default: false
    },
    specKey: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['approved', 'pending_moderation', 'rejected'],
      default: 'approved'
    }
  },
  { timestamps: true }
);

// Helpful score virtual for sorting
productQASchema.virtual('helpfulScore').get(function () {
  return (this.upvotes || 0) - (this.downvotes || 0);
});

module.exports = mongoose.model('ProductQA', productQASchema);

