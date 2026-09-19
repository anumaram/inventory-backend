const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'model', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    mode: {
      type: String,
      enum: ['gemini', 'openrouter', 'groq', 'cerebras', 'nlp', 'system', 'default'],
      default: 'gemini'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const aiConversationSchema = new mongoose.Schema(
  {
    aiType: {
      type: String,
      enum: ['darwin', 'atlas', 'titan'],
      required: true,
      default: 'darwin',
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    userType: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer'
    },
    // Backwards compatibility for Darwin queries
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    agentMode: {
      type: String,
      default: 'default'
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true
    },
    messages: [messageSchema],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true, collection: 'aiconversations' }
);

aiConversationSchema.index({ aiType: 1, userId: 1, isDeleted: 1, updatedAt: -1 });
aiConversationSchema.index({ customerId: 1, isDeleted: 1, updatedAt: -1 });

// Ensure customerId and userId stay synchronized for customer (Darwin) records
aiConversationSchema.pre('save', function () {
  if (this.aiType === 'darwin' && !this.customerId && this.userId) {
    this.customerId = this.userId;
  }
  if (!this.userId && this.customerId) {
    this.userId = this.customerId;
  }
});

const AiConversation = mongoose.model('AiConversation', aiConversationSchema);
module.exports = AiConversation;
