const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'customer', 'admin', 'vendor', 'ai', 'system'],
      default: 'customer'
    },
    senderName: { type: String, default: '' },
    text: { type: String, required: true },
    attachments: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userType: { type: String, enum: ['customer', 'vendor'], default: 'customer' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String, default: 'User' },
    userEmail: { type: String, default: '' },
    userPhone: { type: String, default: '' },

    // Linked Entities
    orderId: { type: String, default: '', index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    productName: { type: String, default: '' },
    transactionId: { type: String, default: '', index: true },

    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'order',
        'product',
        'payment',
        'refund',
        'delivery',
        'account',
        'ai_assistant',
        'app_issue',
        'vendor_query',
        'general',
        'other'
      ],
      default: 'general'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open'
    },
    messages: [ticketMessageSchema],
    assignedTo: { type: String, default: 'Support Team' },

    // AI Intelligence analysis
    aiAnalysis: {
      sentiment: { type: String, default: 'neutral' }, // positive, neutral, frustrated, urgent
      summary: { type: String, default: '' },
      suggestedResolution: { type: String, default: '' },
      confidenceScore: { type: Number, default: 0.9 },
      categoryDetected: { type: String, default: '' },
      lastAnalyzedAt: { type: Date }
    },

    resolutionSummary: { type: String, default: '' },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

supportTicketSchema.index({ customerId: 1, createdAt: -1 });
supportTicketSchema.index({ vendorId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ category: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
