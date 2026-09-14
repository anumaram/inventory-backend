const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'admin', 'system'], default: 'user' },
    senderName: { type: String, default: '' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    userType: { type: String, enum: ['customer', 'vendor'], default: 'customer' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: 'User' },
    userEmail: { type: String, default: '' },
    orderId: { type: String, default: '' },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['order', 'payment', 'refund', 'delivery', 'account', 'other'],
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
    resolvedAt: Date
  },
  { timestamps: true }
);

supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

