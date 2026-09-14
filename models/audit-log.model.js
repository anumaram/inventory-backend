const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminName: { type: String, default: 'Admin' },
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['customer', 'vendor', 'product', 'order', 'return', 'refund', 'wallet', 'coupon', 'promotion', 'warehouse', 'settings', 'role', 'auth', 'cron_service', 'cron_scheduler', 'ticket', 'system'],
      required: true
    },
    entityId: { type: String, default: '' },
    details: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '127.0.0.1' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

