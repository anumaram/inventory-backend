const mongoose = require('mongoose');

const aiSettingsSchema = new mongoose.Schema(
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
    aiProviderPreference: {
      type: String,
      enum: ['auto', 'gemini', 'openrouter', 'groq', 'cerebras', 'nlp'],
      default: 'auto'
    },
    activeAgentMode: {
      type: String,
      default: 'default'
    },
    voiceInputEnabled: {
      type: Boolean,
      default: true
    },
    suggestedPromptsEnabled: {
      type: Boolean,
      default: true
    },
    saveConversationsEnabled: {
      type: Boolean,
      default: true
    },

    // Customer / Darwin specific settings
    defaultAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null
    },
    defaultPaymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      default: null
    },
    preferredCategories: {
      type: [String],
      default: []
    },
    budgetPreference: {
      type: Number,
      default: 0
    },

    // Vendor / Atlas specific settings
    reorderThreshold: {
      type: Number,
      default: 10
    },
    deadStockDays: {
      type: Number,
      default: 30
    },
    targetMarginPct: {
      type: Number,
      default: 25
    },

    // Admin / Titan specific settings
    anomalyThresholdPct: {
      type: Number,
      default: 20
    },
    defaultTimeframe: {
      type: String,
      default: '30d'
    },
    alertNotifications: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true, collection: 'aisettings' }
);

aiSettingsSchema.index({ aiType: 1, userId: 1 }, { unique: true });

// Ensure customerId and userId stay synchronized for customer (Darwin) records
aiSettingsSchema.pre('save', function () {
  if (this.aiType === 'darwin' && !this.customerId && this.userId) {
    this.customerId = this.userId;
  }
  if (!this.userId && this.customerId) {
    this.userId = this.customerId;
  }
});

const AiSettings = mongoose.model('AiSettings', aiSettingsSchema);
module.exports = AiSettings;
