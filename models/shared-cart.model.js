const mongoose = require('mongoose');

const sharedCartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    creatorName: { type: String, default: 'Creator' },
    shareCode: { type: String, required: true, unique: true, index: true },
    template: {
      type: String,
      default: 'trip',
      set: v => (v || 'trip').toString().toLowerCase()
    },
    targetBudget: { type: Number, default: 0 },
    memberAccess: {
      type: String,
      enum: ['full', 'vote_only', 'admin_only'],
      default: 'full'
    },
    members: [
      {
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        name: { type: String, required: true },
        avatar: { type: String, default: '' },
        role: { type: String, enum: ['creator', 'member'], default: 'member' },
        isReady: { type: Boolean, default: false },
        joinedAt: { type: Date, default: Date.now }
      }
    ],
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        image: { type: String, default: '' },
        price: { type: Number, required: true },
        vendorName: { type: String, default: 'Vendor' },
        quantity: { type: Number, default: 1, min: 1 },
        addedBy: {
          customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
          name: { type: String }
        },
        votes: [
          {
            customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
            customerName: { type: String },
            vote: { type: String, enum: ['up', 'down', 'unsure'], default: 'up' }
          }
        ],
        comments: [
          {
            customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
            customerName: { type: String },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
          }
        ]
      }
    ],
    messages: [
      {
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        senderName: { type: String, required: true },
        text: { type: String, default: '' },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productPreview: {
          name: { type: String },
          price: { type: Number },
          image: { type: String }
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    activityLog: [
      {
        action: { type: String, required: true }, // 'created', 'joined', 'item_added', 'item_removed', 'vote', 'comment', 'ready_toggle', 'checkout'
        userName: { type: String, required: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        details: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    status: {
      type: String,
      enum: ['active', 'checked_out', 'archived'],
      default: 'active'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SharedCart', sharedCartSchema);

