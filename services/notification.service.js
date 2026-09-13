const Notification = require('../models/notification.model');
const mongoose = require('mongoose');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

/**
 * Create a new in-app notification
 */
async function createNotification({
  recipientType,
  recipientId,
  title,
  message,
  type = 'general',
  orderId = '',
  productId = null,
  actionUrl = ''
}) {
  if (!recipientType || !recipientId || !title || !message) return null;

  try {
    const notif = await Notification.create({
      recipientType,
      recipientId: toObjectId(recipientId),
      title,
      message,
      type,
      orderId,
      productId: productId ? toObjectId(productId) : undefined,
      actionUrl
    });
    return notif;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
    return null;
  }
}

/**
 * Get notifications for a user with unread count
 */
async function getNotifications({ recipientType, recipientId, limit = 50 }) {
  const query = {
    recipientType,
    recipientId: toObjectId(recipientId),
    isDeleted: { $ne: true }
  };

  const [items, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ ...query, isRead: false })
  ]);

  return { items, unreadCount };
}

/**
 * Mark a single notification as read
 */
async function markAsRead(id, recipientId) {
  return Notification.findOneAndUpdate(
    { _id: toObjectId(id), recipientId: toObjectId(recipientId), isDeleted: { $ne: true } },
    { isRead: true },
    { new: true }
  );
}

/**
 * Mark all notifications as read for a recipient
 */
async function markAllAsRead({ recipientType, recipientId }) {
  return Notification.updateMany(
    {
      recipientType,
      recipientId: toObjectId(recipientId),
      isDeleted: { $ne: true },
      isRead: false
    },
    { isRead: true }
  );
}

/**
 * Dismiss (soft delete) a single notification
 */
async function dismissNotification(id, recipientId) {
  return Notification.findOneAndUpdate(
    { _id: toObjectId(id), recipientId: toObjectId(recipientId) },
    { isDeleted: true },
    { new: true }
  );
}

/**
 * Clear all notifications for a recipient
 */
async function clearAllNotifications({ recipientType, recipientId }) {
  return Notification.updateMany(
    { recipientType, recipientId: toObjectId(recipientId), isDeleted: { $ne: true } },
    { isDeleted: true }
  );
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearAllNotifications
};

